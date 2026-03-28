import { Kafka, Admin, ITopicConfig } from 'kafkajs'
import { TOPICS, tenantTopic } from './topics'

/** Default config for standard event topics */
const STANDARD_TOPIC_CONFIG: Omit<ITopicConfig, 'topic'> = {
  numPartitions: 12,
  replicationFactor: 3,
  configEntries: [
    { name: 'retention.ms', value: String(7 * 24 * 60 * 60 * 1000) }, // 7 days
    { name: 'min.insync.replicas', value: '2' },
    { name: 'cleanup.policy', value: 'delete' },
  ],
}

/** Config for the high-priority kill-switch topic */
const KILL_SWITCH_TOPIC_CONFIG: Omit<ITopicConfig, 'topic'> = {
  numPartitions: 3, // fewer partitions — dedicated, low-volume, high-priority
  replicationFactor: 3,
  configEntries: [
    { name: 'retention.ms', value: String(60 * 60 * 1000) }, // 1 hour
    { name: 'min.insync.replicas', value: '2' },
    { name: 'cleanup.policy', value: 'delete' },
  ],
}

export interface KafkaAdminConfig {
  brokers: string[]
  clientId?: string
}

export class EchoKafkaAdmin {
  private readonly kafka: Kafka
  private admin: Admin | null = null

  constructor(config: KafkaAdminConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId ?? 'echo-admin',
      brokers: config.brokers,
    })
  }

  private async getAdmin(): Promise<Admin> {
    if (!this.admin) {
      this.admin = this.kafka.admin()
      await this.admin.connect()
    }
    return this.admin
  }

  /**
   * Create all system-wide ECHO topics.
   * Idempotent — skips topics that already exist.
   */
  async createSystemTopics(): Promise<void> {
    const admin = await this.getAdmin()

    const topicsToCreate: ITopicConfig[] = [
      { topic: TOPICS.RAW_BILLING_EVENTS, ...STANDARD_TOPIC_CONFIG },
      { topic: TOPICS.COST_LEAKAGE, ...STANDARD_TOPIC_CONFIG },
      { topic: TOPICS.GOVERNANCE, ...STANDARD_TOPIC_CONFIG },
      { topic: TOPICS.CARBON, ...STANDARD_TOPIC_CONFIG },
      { topic: TOPICS.FINANCIAL, ...STANDARD_TOPIC_CONFIG },
      { topic: TOPICS.AGENT_HEALTH, ...STANDARD_TOPIC_CONFIG },
      { topic: TOPICS.LEDGER_WRITES, ...STANDARD_TOPIC_CONFIG },
      { topic: TOPICS.A2A_MESSAGES, ...STANDARD_TOPIC_CONFIG },
      { topic: TOPICS.KILL_SWITCH, ...KILL_SWITCH_TOPIC_CONFIG },
    ]

    await admin.createTopics({
      topics: topicsToCreate,
      waitForLeaders: true,
    })
  }

  /**
   * Create per-tenant topics for a given tenant.
   * Convention: {tenant_id}.{event_type}
   */
  async createTenantTopics(tenantId: string): Promise<void> {
    const admin = await this.getAdmin()

    const eventTypes = [
      'billing.events',
      'cost_leakage',
      'governance',
      'carbon',
      'financial',
      'agent_health',
      'ledger_writes',
      'a2a_messages',
    ]

    const topicsToCreate: ITopicConfig[] = eventTypes.map((eventType) => ({
      topic: tenantTopic(tenantId, eventType),
      ...STANDARD_TOPIC_CONFIG,
    }))

    await admin.createTopics({
      topics: topicsToCreate,
      waitForLeaders: true,
    })
  }

  /**
   * Delete per-tenant topics when a tenant is deprovisioned.
   */
  async deleteTenantTopics(tenantId: string): Promise<void> {
    const admin = await this.getAdmin()
    const existingTopics = await admin.listTopics()
    const tenantTopics = existingTopics.filter((t) => t.startsWith(`${tenantId}.`))

    if (tenantTopics.length > 0) {
      await admin.deleteTopics({ topics: tenantTopics })
    }
  }

  /**
   * List all existing topics.
   */
  async listTopics(): Promise<string[]> {
    const admin = await this.getAdmin()
    return admin.listTopics()
  }

  async disconnect(): Promise<void> {
    if (this.admin) {
      await this.admin.disconnect()
      this.admin = null
    }
  }
}
