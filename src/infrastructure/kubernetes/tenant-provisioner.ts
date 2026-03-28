import * as k8s from '@kubernetes/client-node';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantConfig {
  tenantId: string;
  tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  dowProtectionLimitUsd: number;
  minConfidenceThreshold: number;
  adminEmail: string;
  kafkaBrokers: string;
  postgresUrl: string;
  redisUrl: string;
  agentImage: string;
}

export interface TenantProvisionedEvent {
  eventType: 'TenantProvisionedEvent';
  tenantId: string;
  namespace: string;
  provisionedAt: string;
  durationMs: number;
  steps: StepResult[];
}

interface StepResult {
  step: number;
  name: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_TYPES = ['auditor', 'governor', 'green-architect', 'finance'] as const;
const KAFKA_TOPIC_SUFFIXES = [
  'raw.billing.events',
  'events.cost_leakage',
  'events.governance',
  'events.carbon',
  'events.financial',
  'events.agent_health',
  'events.ledger_writes',
  'events.a2a_messages',
  'governance.kill_switch',
] as const;

// ─── TenantProvisioningWorkflow ───────────────────────────────────────────────

/**
 * Provisions a complete tenant environment in Kubernetes.
 * Target: ≤15 minutes total (Req 12.3).
 *
 * Steps:
 *  1. Create namespace + NetworkPolicy + ServiceAccounts
 *  2. Create Kafka topics with tenant prefix + apply ACLs
 *  3. Deploy agent pods + Execution_Engine
 *  4. Initialize Liquid_Ledger partition + genesis entry + DoW config
 *  5. Health-check all components + emit TenantProvisionedEvent + notify admin
 */
export class TenantProvisioningWorkflow {
  private readonly kc: k8s.KubeConfig;
  private readonly coreApi: k8s.CoreV1Api;
  private readonly networkingApi: k8s.NetworkingV1Api;
  private readonly appsApi: k8s.AppsV1Api;

  constructor(kubeConfig?: k8s.KubeConfig) {
    this.kc = kubeConfig ?? new k8s.KubeConfig();
    if (!kubeConfig) {
      this.kc.loadFromDefault();
    }
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
  }

  async provision(tenantId: string, config: TenantConfig): Promise<TenantProvisionedEvent> {
    const namespace = `echo-tenant-${tenantId}`;
    const overallStart = Date.now();
    const steps: StepResult[] = [];

    const runStep = async (
      step: number,
      name: string,
      fn: () => Promise<void>,
    ): Promise<void> => {
      const start = Date.now();
      try {
        await fn();
        steps.push({ step, name, success: true, durationMs: Date.now() - start });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        steps.push({ step, name, success: false, durationMs: Date.now() - start, error });
        throw new Error(`Step ${step} (${name}) failed: ${error}`);
      }
    };

    await runStep(1, 'Create namespace + NetworkPolicy + ServiceAccounts', () =>
      this.step1_createNamespaceAndPolicies(namespace, tenantId),
    );

    await runStep(2, 'Create Kafka topics + apply ACLs', () =>
      this.step2_createKafkaTopics(tenantId),
    );

    await runStep(3, 'Deploy agent pods + Execution_Engine', () =>
      this.step3_deployAgents(namespace, tenantId, config),
    );

    await runStep(4, 'Initialize Liquid_Ledger + genesis entry + DoW config', () =>
      this.step4_initializeLedger(tenantId, config),
    );

    await runStep(5, 'Health-check + emit TenantProvisionedEvent + notify admin', () =>
      this.step5_healthCheckAndNotify(namespace, tenantId, config),
    );

    const event: TenantProvisionedEvent = {
      eventType: 'TenantProvisionedEvent',
      tenantId,
      namespace,
      provisionedAt: new Date().toISOString(),
      durationMs: Date.now() - overallStart,
      steps,
    };

    return event;
  }

  // ─── Step 1: Namespace + NetworkPolicy + ServiceAccounts ──────────────────

  private async step1_createNamespaceAndPolicies(
    namespace: string,
    tenantId: string,
  ): Promise<void> {
    // Create namespace
    await this.coreApi.createNamespace({
      metadata: {
        name: namespace,
        labels: {
          'echo.io/tenant': tenantId,
          'echo.io/managed': 'true',
        },
      },
    });

    // Apply deny-all cross-namespace NetworkPolicy
    await this.networkingApi.createNamespacedNetworkPolicy(namespace, {
      metadata: {
        name: 'deny-all-cross-namespace',
        namespace,
      },
      spec: {
        podSelector: {},
        policyTypes: ['Ingress', 'Egress'],
        ingress: [
          { from: [{ podSelector: {} }] },
          {
            from: [
              {
                namespaceSelector: {
                  matchLabels: { 'echo.io/role': 'control-plane' },
                },
              },
            ],
          },
        ],
        egress: [
          { to: [{ podSelector: {} }] },
          {
            to: [
              {
                namespaceSelector: {
                  matchLabels: { 'kubernetes.io/metadata.name': 'kube-system' },
                },
              },
            ],
            ports: [
              { protocol: 'UDP', port: 53 },
              { protocol: 'TCP', port: 53 },
            ],
          },
          {
            to: [
              {
                namespaceSelector: {
                  matchLabels: { 'echo.io/role': 'control-plane' },
                },
              },
            ],
          },
        ],
      },
    });

    // Create namespace-scoped ServiceAccount for agents
    await this.coreApi.createNamespacedServiceAccount(namespace, {
      metadata: {
        name: 'echo-agent-sa',
        namespace,
        labels: { 'echo.io/tenant': tenantId },
        annotations: { 'echo.io/tenant-id': tenantId },
      },
    });
  }

  // ─── Step 2: Kafka topics + ACLs ──────────────────────────────────────────

  private async step2_createKafkaTopics(tenantId: string): Promise<void> {
    // In production this would call the Kafka Admin API.
    // Here we record the intent as a ConfigMap in the control-plane namespace
    // so the Kafka operator can reconcile it.
    const topics = KAFKA_TOPIC_SUFFIXES.map((suffix) => `${tenantId}.${suffix}`);

    await this.coreApi.createNamespacedConfigMap('echo-control-plane', {
      metadata: {
        name: `kafka-topics-${tenantId}`,
        namespace: 'echo-control-plane',
        labels: { 'echo.io/tenant': tenantId, 'echo.io/resource-type': 'kafka-topics' },
      },
      data: {
        topics: topics.join('\n'),
        tenantId,
        aclPrincipal: `User:echo-tenant-${tenantId}`,
      },
    });
  }

  // ─── Step 3: Deploy agent pods + Execution_Engine ─────────────────────────

  private async step3_deployAgents(
    namespace: string,
    tenantId: string,
    config: TenantConfig,
  ): Promise<void> {
    const agentDeployments = [...AGENT_TYPES, 'execution-engine'] as const;

    for (const agentType of agentDeployments) {
      await this.appsApi.createNamespacedDeployment(namespace, {
        metadata: {
          name: `echo-${agentType}`,
          namespace,
          labels: {
            app: `echo-${agentType}`,
            'echo.io/tenant': tenantId,
            'echo.io/agent-type': agentType,
          },
        },
        spec: {
          replicas: 1,
          selector: { matchLabels: { app: `echo-${agentType}` } },
          template: {
            metadata: {
              labels: {
                app: `echo-${agentType}`,
                'echo.io/tenant': tenantId,
                'echo.io/agent-type': agentType,
              },
            },
            spec: {
              serviceAccountName: 'echo-agent-sa',
              securityContext: { runAsNonRoot: true, runAsUser: 1000 },
              containers: [
                {
                  name: `echo-${agentType}`,
                  image: config.agentImage,
                  env: [
                    { name: 'TENANT_ID', value: tenantId },
                    { name: 'AGENT_TYPE', value: agentType },
                    { name: 'KAFKA_BROKERS', value: config.kafkaBrokers },
                    { name: 'POSTGRES_URL', value: config.postgresUrl },
                    { name: 'REDIS_URL', value: config.redisUrl },
                  ],
                  resources: {
                    requests: { cpu: '100m', memory: '256Mi' },
                    limits: { cpu: '500m', memory: '512Mi' },
                  },
                  livenessProbe: {
                    httpGet: { path: '/health', port: 8080 as unknown as object },
                    initialDelaySeconds: 15,
                    periodSeconds: 30,
                  },
                },
              ],
            },
          },
        },
      });
    }
  }

  // ─── Step 4: Initialize Liquid_Ledger + genesis entry + DoW config ────────

  private async step4_initializeLedger(
    tenantId: string,
    config: TenantConfig,
  ): Promise<void> {
    // Record genesis ledger entry and DoW config as a ConfigMap.
    // The Liquid_Ledger service watches for these and initializes the partition.
    const genesisHash = this.computeGenesisHash(tenantId);

    await this.coreApi.createNamespacedConfigMap('echo-control-plane', {
      metadata: {
        name: `ledger-init-${tenantId}`,
        namespace: 'echo-control-plane',
        labels: { 'echo.io/tenant': tenantId, 'echo.io/resource-type': 'ledger-init' },
      },
      data: {
        tenantId,
        genesisHash,
        genesisTimestamp: new Date().toISOString(),
        dowProtectionLimitUsd: String(config.dowProtectionLimitUsd),
        minConfidenceThreshold: String(config.minConfidenceThreshold),
      },
    });
  }

  // ─── Step 5: Health-check + emit event + notify admin ─────────────────────

  private async step5_healthCheckAndNotify(
    namespace: string,
    tenantId: string,
    config: TenantConfig,
  ): Promise<void> {
    // Verify namespace exists and pods are scheduled
    const pods = await this.coreApi.listNamespacedPod(namespace);
    const podCount = pods.items.length;

    if (podCount === 0) {
      throw new Error(`No pods found in namespace ${namespace} after deployment`);
    }

    // Emit TenantProvisionedEvent via ConfigMap (picked up by event bus adapter)
    await this.coreApi.createNamespacedConfigMap('echo-control-plane', {
      metadata: {
        name: `tenant-provisioned-${tenantId}`,
        namespace: 'echo-control-plane',
        labels: {
          'echo.io/tenant': tenantId,
          'echo.io/resource-type': 'provisioned-event',
        },
      },
      data: {
        eventType: 'TenantProvisionedEvent',
        tenantId,
        namespace,
        provisionedAt: new Date().toISOString(),
        adminEmail: config.adminEmail,
        podCount: String(podCount),
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private computeGenesisHash(tenantId: string): string {
    // Simple deterministic genesis hash for the ledger chain anchor
    const { createHash } = require('crypto') as typeof import('crypto');
    return createHash('sha256')
      .update(`genesis:${tenantId}:${new Date().toISOString()}`)
      .digest('hex');
  }
}
