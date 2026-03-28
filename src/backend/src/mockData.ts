import { v4 as uuidv4 } from 'uuid';

// ── Types (mirror frontend types) ────────────────────────────────────────────

export type AgentType = 'AUDITOR' | 'GOVERNOR' | 'GREEN_ARCHITECT' | 'FINANCE';
export type AgentStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'ISOLATED' | 'SUSPENDED';
export type AnomalyCategory = 'IDLE' | 'OVER_PROVISIONED' | 'ORPHANED' | 'USAGE_SPIKE';
export type ApprovalState =
  | 'PENDING_SIMULATION' | 'SIMULATION_PASSED' | 'REQUIRE_HUMAN_APPROVAL'
  | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'ROLLED_BACK';
export type ReasoningTier = 'FAST' | 'MEDIUM' | 'DEEP';
export type ModelTier = 'FAST' | 'MEDIUM' | 'DEEP';

export interface Agent {
  id: string; name: string; type: AgentType; status: AgentStatus;
  lastAction: string; lastActionTs: string; healthScore: number;
  confidenceThreshold: number; reasoningAccuracy: number; hallucinationRate: number;
  actionsToday: number; lastReasoningChain?: string;
}

export interface CostLeakageEvent {
  eventId: string; tenantId: string; resourceId: string;
  anomalyCategory: AnomalyCategory; hourlyCostUsd: number;
  detectionTs: string; costImpactMath: string; region: string;
  provider: 'AWS' | 'Azure' | 'GCP';
}

export interface CostMath {
  currentCostUsd: number; optimizedCostUsd: number; hoursPerMonth: number;
  formula: string; projectedMonthlySavings: number;
}

export interface Action {
  actionId: string; type: string; targetResources: string[];
  riskScore: number; confidenceThreshold: number; approvalState: ApprovalState;
  simulationStatus: string; projectedSavings: number; costMath: CostMath;
  reasoningTier: ReasoningTier; createdAt: string; agentId: string; reasoning?: string;
}

export interface ROISummary {
  cumulativeRoi: number; projectedAnnualSavings: number; costPerInsight: number;
  totalSavingsUsd: number; platformCostUsd: number;
  sparklineData: { date: string; value: number }[];
}

export interface A2AMessage {
  messageId: string; fromAgent: AgentType; toAgent: AgentType;
  taskType: string; timestamp: string; payloadPreview: string; latencyMs: number;
}

export interface CarbonSummary {
  monthlySavingsKgCo2e: number; workloadCategory: string; region: string;
  byRegion: { region: string; savingsKgCo2e: number }[]; trend: number;
}

export interface GovernanceReport {
  actionsTotal: number; actionsBlocked: number; killSwitchEvents: number;
  dowTriggers: number; date: string; complianceScore: number;
}

export interface ModelPerformance {
  provider: string; model: string; latencyMs: number; costPerToken: number;
  accuracyPct: number; tier: ModelTier; requestsToday: number;
}

export interface DoWConfig {
  dailySpendLimitUsd: number; currentRollingSpendUsd: number;
  lastTriggeredTs: string | null; alertThresholdPct: number;
}

// ── Mutable state ─────────────────────────────────────────────────────────────

export const state = {
  killSwitchActive: false,
  dowConfig: {
    dailySpendLimitUsd: 50000,
    currentRollingSpendUsd: 31240,
    lastTriggeredTs: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    alertThresholdPct: 80,
  } as DoWConfig,
};

// ── Static mock data ──────────────────────────────────────────────────────────

export const agents: Agent[] = [
  {
    id: 'agent-auditor', name: 'Auditor Agent', type: 'AUDITOR', status: 'HEALTHY',
    lastAction: 'Detected 3 idle EC2 instances in us-east-1',
    lastActionTs: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    healthScore: 98, confidenceThreshold: 85, reasoningAccuracy: 94.2,
    hallucinationRate: 1.8, actionsToday: 47,
    lastReasoningChain: 'Analyzed billing stream → identified anomaly pattern → cross-referenced utilization metrics → confirmed idle state with 94% confidence → proposed rightsizing action',
  },
  {
    id: 'agent-governor', name: 'Governor Agent', type: 'GOVERNOR', status: 'HEALTHY',
    lastAction: 'Approved 2 actions, blocked 1 (risk score 87)',
    lastActionTs: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    healthScore: 100, confidenceThreshold: 90, reasoningAccuracy: 97.1,
    hallucinationRate: 0.9, actionsToday: 23,
    lastReasoningChain: 'Received action proposal → evaluated risk score (42) → checked DoW limits → verified simulation passed → approved with confidence 97%',
  },
  {
    id: 'agent-green', name: 'Green Architect', type: 'GREEN_ARCHITECT', status: 'HEALTHY',
    lastAction: 'Scheduled 4 workloads to low-carbon regions',
    lastActionTs: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    healthScore: 95, confidenceThreshold: 80, reasoningAccuracy: 91.5,
    hallucinationRate: 2.3, actionsToday: 12,
    lastReasoningChain: 'Fetched carbon intensity data → identified eu-west-1 at 45g CO₂e/kWh vs us-east-1 at 380g → calculated migration savings → proposed workload shift',
  },
  {
    id: 'agent-finance', name: 'Finance Agent', type: 'FINANCE', status: 'HEALTHY',
    lastAction: 'Updated ROI model: +$12,400 projected savings',
    lastActionTs: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    healthScore: 99, confidenceThreshold: 88, reasoningAccuracy: 96.8,
    hallucinationRate: 1.1, actionsToday: 31,
    lastReasoningChain: 'Ingested execution outcomes → recalculated NPV model → updated ROI projections → flagged SLA penalty risk on 2 contracts → notified Governor',
  },
];

export const costLeakageEvents: CostLeakageEvent[] = [
  { eventId: 'evt-001', tenantId: 'tenant-acme', resourceId: 'i-0a1b2c3d4e5f', anomalyCategory: 'IDLE', hourlyCostUsd: 2.34, detectionTs: new Date(Date.now() - 3 * 60 * 1000).toISOString(), costImpactMath: '$2.34/hr × 720 hrs = $1,685/mo', region: 'us-east-1', provider: 'AWS' },
  { eventId: 'evt-002', tenantId: 'tenant-acme', resourceId: 'vm-prod-db-07', anomalyCategory: 'OVER_PROVISIONED', hourlyCostUsd: 8.12, detectionTs: new Date(Date.now() - 7 * 60 * 1000).toISOString(), costImpactMath: '$8.12/hr × 720 hrs = $5,846/mo', region: 'eastus', provider: 'Azure' },
  { eventId: 'evt-003', tenantId: 'tenant-acme', resourceId: 'disk-orphan-4421', anomalyCategory: 'ORPHANED', hourlyCostUsd: 0.48, detectionTs: new Date(Date.now() - 15 * 60 * 1000).toISOString(), costImpactMath: '$0.48/hr × 720 hrs = $346/mo', region: 'us-central1', provider: 'GCP' },
  { eventId: 'evt-004', tenantId: 'tenant-acme', resourceId: 'lambda-batch-proc', anomalyCategory: 'USAGE_SPIKE', hourlyCostUsd: 45.20, detectionTs: new Date(Date.now() - 22 * 60 * 1000).toISOString(), costImpactMath: 'Spike: $45.20/hr vs baseline $3.10/hr', region: 'us-west-2', provider: 'AWS' },
  { eventId: 'evt-005', tenantId: 'tenant-acme', resourceId: 'i-0f9e8d7c6b5a', anomalyCategory: 'IDLE', hourlyCostUsd: 1.87, detectionTs: new Date(Date.now() - 35 * 60 * 1000).toISOString(), costImpactMath: '$1.87/hr × 720 hrs = $1,346/mo', region: 'eu-west-1', provider: 'AWS' },
  { eventId: 'evt-006', tenantId: 'tenant-acme', resourceId: 'aks-node-pool-3', anomalyCategory: 'OVER_PROVISIONED', hourlyCostUsd: 12.40, detectionTs: new Date(Date.now() - 48 * 60 * 1000).toISOString(), costImpactMath: '$12.40/hr × 720 hrs = $8,928/mo', region: 'westeurope', provider: 'Azure' },
  { eventId: 'evt-007', tenantId: 'tenant-acme', resourceId: 'snapshot-old-2022', anomalyCategory: 'ORPHANED', hourlyCostUsd: 0.12, detectionTs: new Date(Date.now() - 62 * 60 * 1000).toISOString(), costImpactMath: '$0.12/hr × 720 hrs = $86/mo', region: 'us-east-1', provider: 'AWS' },
  { eventId: 'evt-008', tenantId: 'tenant-acme', resourceId: 'gke-cluster-dev', anomalyCategory: 'USAGE_SPIKE', hourlyCostUsd: 28.90, detectionTs: new Date(Date.now() - 75 * 60 * 1000).toISOString(), costImpactMath: 'Spike: $28.90/hr vs baseline $6.20/hr', region: 'us-central1', provider: 'GCP' },
  { eventId: 'evt-009', tenantId: 'tenant-acme', resourceId: 'rds-prod-replica-2', anomalyCategory: 'IDLE', hourlyCostUsd: 3.60, detectionTs: new Date(Date.now() - 90 * 60 * 1000).toISOString(), costImpactMath: '$3.60/hr × 720 hrs = $2,592/mo', region: 'ap-southeast-1', provider: 'AWS' },
  { eventId: 'evt-010', tenantId: 'tenant-acme', resourceId: 'vm-test-legacy-01', anomalyCategory: 'OVER_PROVISIONED', hourlyCostUsd: 5.75, detectionTs: new Date(Date.now() - 110 * 60 * 1000).toISOString(), costImpactMath: '$5.75/hr × 720 hrs = $4,140/mo', region: 'eastus2', provider: 'Azure' },
];

export const actions: Action[] = [
  { actionId: 'act-001', type: 'RIGHTSIZING', targetResources: ['i-0a1b2c3d4e5f', 'i-0f9e8d7c6b5a'], riskScore: 22, confidenceThreshold: 94, approvalState: 'APPROVED', simulationStatus: 'PASSED', projectedSavings: 3031, costMath: { currentCostUsd: 4.21, optimizedCostUsd: 1.05, hoursPerMonth: 720, formula: '($4.21 - $1.05) × 720 hrs', projectedMonthlySavings: 3031 }, reasoningTier: 'MEDIUM', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), agentId: 'agent-auditor', reasoning: 'Both instances show <5% CPU utilization over 14 days. Rightsizing from m5.xlarge to m5.medium reduces cost by 75% with negligible performance impact.' },
  { actionId: 'act-002', type: 'TERMINATE_ORPHAN', targetResources: ['disk-orphan-4421', 'snapshot-old-2022'], riskScore: 15, confidenceThreshold: 98, approvalState: 'EXECUTED', simulationStatus: 'PASSED', projectedSavings: 432, costMath: { currentCostUsd: 0.60, optimizedCostUsd: 0, hoursPerMonth: 720, formula: '($0.60 - $0.00) × 720 hrs', projectedMonthlySavings: 432 }, reasoningTier: 'FAST', createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(), agentId: 'agent-auditor', reasoning: 'Resources have no active attachments for 45+ days. Safe to terminate.' },
  { actionId: 'act-003', type: 'SCHEDULE_SHUTDOWN', targetResources: ['rds-prod-replica-2'], riskScore: 45, confidenceThreshold: 87, approvalState: 'REQUIRE_HUMAN_APPROVAL', simulationStatus: 'PASSED', projectedSavings: 2592, costMath: { currentCostUsd: 3.60, optimizedCostUsd: 0, hoursPerMonth: 720, formula: '($3.60 - $0.00) × 720 hrs', projectedMonthlySavings: 2592 }, reasoningTier: 'DEEP', createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), agentId: 'agent-auditor', reasoning: 'RDS replica shows zero read queries for 7 days. Scheduling shutdown during off-peak hours (02:00-06:00 UTC) could save $2,592/mo. Risk: potential read latency if primary fails.' },
  { actionId: 'act-004', type: 'WORKLOAD_MIGRATION', targetResources: ['gke-cluster-dev'], riskScore: 78, confidenceThreshold: 82, approvalState: 'REQUIRE_HUMAN_APPROVAL', simulationStatus: 'PASSED', projectedSavings: 8200, costMath: { currentCostUsd: 28.90, optimizedCostUsd: 17.50, hoursPerMonth: 720, formula: '($28.90 - $17.50) × 720 hrs', projectedMonthlySavings: 8208 }, reasoningTier: 'DEEP', createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), agentId: 'agent-green', reasoning: 'Migrating GKE workload from us-central1 (380g CO₂e/kWh) to eu-west-1 (45g CO₂e/kWh) reduces carbon footprint by 88% and saves $8,200/mo via spot pricing.' },
  { actionId: 'act-005', type: 'RESERVED_INSTANCE_PURCHASE', targetResources: ['aks-node-pool-3'], riskScore: 35, confidenceThreshold: 91, approvalState: 'SIMULATION_PASSED', simulationStatus: 'PASSED', projectedSavings: 5368, costMath: { currentCostUsd: 12.40, optimizedCostUsd: 4.95, hoursPerMonth: 720, formula: '($12.40 - $4.95) × 720 hrs', projectedMonthlySavings: 5364 }, reasoningTier: 'MEDIUM', createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), agentId: 'agent-finance', reasoning: 'AKS node pool has consistent 85%+ utilization for 60 days. 1-year reserved instance commitment yields 60% discount.' },
  { actionId: 'act-006', type: 'SPOT_MIGRATION', targetResources: ['vm-prod-db-07'], riskScore: 62, confidenceThreshold: 79, approvalState: 'PENDING_SIMULATION', simulationStatus: 'RUNNING', projectedSavings: 4094, costMath: { currentCostUsd: 8.12, optimizedCostUsd: 2.44, hoursPerMonth: 720, formula: '($8.12 - $2.44) × 720 hrs', projectedMonthlySavings: 4090 }, reasoningTier: 'DEEP', createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), agentId: 'agent-auditor', reasoning: 'Evaluating spot instance migration for non-critical batch workload. Simulation in progress.' },
  { actionId: 'act-007', type: 'RIGHTSIZING', targetResources: ['vm-test-legacy-01'], riskScore: 18, confidenceThreshold: 96, approvalState: 'REJECTED', simulationStatus: 'PASSED', projectedSavings: 2484, costMath: { currentCostUsd: 5.75, optimizedCostUsd: 2.30, hoursPerMonth: 720, formula: '($5.75 - $2.30) × 720 hrs', projectedMonthlySavings: 2484 }, reasoningTier: 'FAST', createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(), agentId: 'agent-auditor', reasoning: 'Legacy VM flagged for rightsizing. Rejected by operator — scheduled for decommission instead.' },
  { actionId: 'act-008', type: 'SCHEDULE_SHUTDOWN', targetResources: ['lambda-batch-proc'], riskScore: 55, confidenceThreshold: 85, approvalState: 'ROLLED_BACK', simulationStatus: 'PASSED', projectedSavings: 1512, costMath: { currentCostUsd: 45.20, optimizedCostUsd: 43.10, hoursPerMonth: 720, formula: 'Throttle spike: ($45.20 - $43.10) × 720 hrs', projectedMonthlySavings: 1512 }, reasoningTier: 'MEDIUM', createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(), agentId: 'agent-governor', reasoning: 'Throttling applied but rolled back after downstream latency increase detected.' },
];

const now = Date.now();
export const roiSummary: ROISummary = {
  cumulativeRoi: 340,
  projectedAnnualSavings: 4_800_000,
  costPerInsight: 0.42,
  totalSavingsUsd: 2_400_000,
  platformCostUsd: 706_000,
  sparklineData: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(now - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    value: 1_200_000 + Math.random() * 200_000 * i * 0.1 + i * 40_000,
  })),
};

export const a2aMessages: A2AMessage[] = [
  { messageId: 'msg-001', fromAgent: 'AUDITOR', toAgent: 'GOVERNOR', taskType: 'ACTION_PROPOSED', timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), payloadPreview: 'Rightsizing proposal for i-0a1b2c3d4e5f, risk=22', latencyMs: 45 },
  { messageId: 'msg-002', fromAgent: 'GOVERNOR', toAgent: 'FINANCE', taskType: 'ROI_CALCULATION', timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(), payloadPreview: 'Calculate ROI for act-001, projected savings $3,031', latencyMs: 120 },
  { messageId: 'msg-003', fromAgent: 'FINANCE', toAgent: 'GOVERNOR', taskType: 'GOVERNANCE_CHECK', timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(), payloadPreview: 'ROI confirmed: 340%, DoW limit OK', latencyMs: 89 },
  { messageId: 'msg-004', fromAgent: 'AUDITOR', toAgent: 'GREEN_ARCHITECT', taskType: 'ANOMALY_DETECTED', timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(), payloadPreview: 'High carbon workload detected in us-central1', latencyMs: 34 },
  { messageId: 'msg-005', fromAgent: 'GREEN_ARCHITECT', toAgent: 'GOVERNOR', taskType: 'ACTION_PROPOSED', timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(), payloadPreview: 'Workload migration to eu-west-1, CO₂ savings 88%', latencyMs: 210 },
  { messageId: 'msg-006', fromAgent: 'GOVERNOR', toAgent: 'AUDITOR', taskType: 'APPROVAL_REQUIRED', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), payloadPreview: 'Human approval required for act-003 (risk=45)', latencyMs: 56 },
  { messageId: 'msg-007', fromAgent: 'AUDITOR', toAgent: 'FINANCE', taskType: 'SIMULATION_REQUEST', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), payloadPreview: 'Simulate spot migration for vm-prod-db-07', latencyMs: 78 },
  { messageId: 'msg-008', fromAgent: 'FINANCE', toAgent: 'AUDITOR', taskType: 'EXECUTION_COMPLETE', timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(), payloadPreview: 'Orphan termination executed, savings $432 confirmed', latencyMs: 145 },
  { messageId: 'msg-009', fromAgent: 'GREEN_ARCHITECT', toAgent: 'FINANCE', taskType: 'CARBON_ANALYSIS', timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(), payloadPreview: 'Carbon report: 1,240 kg CO₂e saved this month', latencyMs: 67 },
  { messageId: 'msg-010', fromAgent: 'GOVERNOR', toAgent: 'GREEN_ARCHITECT', taskType: 'GOVERNANCE_CHECK', timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(), payloadPreview: 'Policy check passed for workload migration', latencyMs: 92 },
];

export const carbonSummary: CarbonSummary = {
  monthlySavingsKgCo2e: 1240,
  workloadCategory: 'Compute + Storage',
  region: 'eu-west-1',
  trend: 18.4,
  byRegion: [
    { region: 'eu-west-1', savingsKgCo2e: 520 },
    { region: 'us-east-1', savingsKgCo2e: 310 },
    { region: 'ap-southeast-1', savingsKgCo2e: 220 },
    { region: 'us-west-2', savingsKgCo2e: 130 },
    { region: 'eastus', savingsKgCo2e: 60 },
  ],
};

export const governanceReport: GovernanceReport = {
  actionsTotal: 156, actionsBlocked: 12, killSwitchEvents: 1,
  dowTriggers: 3, date: new Date().toISOString().split('T')[0], complianceScore: 98.2,
};

export const modelPerformance: ModelPerformance[] = [
  { provider: 'OpenAI', model: 'GPT-4o', latencyMs: 380, costPerToken: 0.000015, accuracyPct: 93.2, tier: 'FAST', requestsToday: 1847 },
  { provider: 'Anthropic', model: 'Claude 3.5 Sonnet', latencyMs: 8200, costPerToken: 0.000003, accuracyPct: 96.8, tier: 'MEDIUM', requestsToday: 423 },
  { provider: 'OpenAI', model: 'o3', latencyMs: 72000, costPerToken: 0.000060, accuracyPct: 98.9, tier: 'DEEP', requestsToday: 47 },
  { provider: 'Google', model: 'Gemini 1.5 Pro', latencyMs: 45000, costPerToken: 0.000007, accuracyPct: 95.1, tier: 'DEEP', requestsToday: 31 },
];

// ── Live event generators ─────────────────────────────────────────────────────

const categories: AnomalyCategory[] = ['IDLE', 'OVER_PROVISIONED', 'ORPHANED', 'USAGE_SPIKE'];
const providers = ['AWS', 'Azure', 'GCP'] as const;
const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'us-west-2', 'eastus'];
const agentTypes: AgentType[] = ['AUDITOR', 'GOVERNOR', 'GREEN_ARCHITECT', 'FINANCE'];
const taskTypes = ['ANOMALY_DETECTED', 'ACTION_PROPOSED', 'GOVERNANCE_CHECK', 'ROI_CALCULATION', 'CARBON_ANALYSIS', 'EXECUTION_COMPLETE'];

let eventCounter = 200;

export function generateLeakageEvent(): CostLeakageEvent {
  const category = categories[Math.floor(Math.random() * categories.length)];
  const provider = providers[Math.floor(Math.random() * providers.length)];
  const region = regions[Math.floor(Math.random() * regions.length)];
  const hourlyCost = parseFloat((Math.random() * 20 + 0.5).toFixed(2));
  return {
    eventId: `evt-live-${++eventCounter}`,
    tenantId: 'tenant-acme',
    resourceId: `resource-${Math.random().toString(36).slice(2, 10)}`,
    anomalyCategory: category,
    hourlyCostUsd: hourlyCost,
    detectionTs: new Date().toISOString(),
    costImpactMath: `$${hourlyCost}/hr × 720 hrs = $${(hourlyCost * 720).toFixed(0)}/mo`,
    region,
    provider,
  };
}

export function generateA2AMessage(): A2AMessage {
  const from = agentTypes[Math.floor(Math.random() * agentTypes.length)];
  let to = agentTypes[Math.floor(Math.random() * agentTypes.length)];
  while (to === from) to = agentTypes[Math.floor(Math.random() * agentTypes.length)];
  const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
  return {
    messageId: `msg-live-${++eventCounter}`,
    fromAgent: from,
    toAgent: to,
    taskType,
    timestamp: new Date().toISOString(),
    payloadPreview: `Live ${taskType.toLowerCase().replace(/_/g, ' ')} from ${from} to ${to}`,
    latencyMs: Math.floor(Math.random() * 200 + 20),
  };
}

export function generateAgentHealthUpdate(): { id: string; healthScore: number; reasoningAccuracy: number; actionsToday: number } {
  const agentIds = ['agent-auditor', 'agent-governor', 'agent-green', 'agent-finance'];
  return {
    id: agentIds[Math.floor(Math.random() * agentIds.length)],
    healthScore: Math.floor(Math.random() * 8 + 92),
    reasoningAccuracy: parseFloat((Math.random() * 5 + 92).toFixed(1)),
    actionsToday: Math.floor(Math.random() * 5 + 10),
  };
}
