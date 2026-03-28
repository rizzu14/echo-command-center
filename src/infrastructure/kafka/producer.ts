import { Kafka, Producer, ProducerRecord, RecordMetadata } from 'kafkajs'
import { TOPICS, TopicName } from './topics'
import type {
  BillingEvent,
  CostLeakageEvent,
  GovernanceEvent,
  CarbonEvent,
  FinancialModelingEvent,
  AgentHealthEvent,
  LedgerWriteEvent,
  A2AMessage,
} from './schemas'

export type EchoEvent =
  | BillingEvent
  | CostLeakageEvent
  | GovernanceEvent
  | CarbonEvent
  | FinancialModelingEvent
  | AgentHealthEvent
  | LedgerWriteEvent
  | A2AMessage

export interface EchoProducerConfig {
  brokers: string[]
  clientId?: string
}

/**
 * Typed Kafka producer for ECHO events.
 *
 * - Idempotent writes enabled (exactly-once semantics within a session)
 * - tenant_id used as the partition key to ensure ordering per tenant
 * - Supports publishing to both system topics and per-tenant topics
 */
export class EchoProducer {
  private readonly kafka: Kafka
  private producer: Producer | null = null

  constructor(config: EchoProducerConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId ?? 'echo-producer',
      brokers: config.brokers,
    })
  }

  private async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer({
        idempotent: true,
        maxInFlightRequests: 5, // required for idempotent producer
        transactionalId: undefined,
      })
      await this.producer.connect()
    }
    return this.producer
  }

  /**
   * Publish a BillingEvent to raw.billing.events.
   * Partition key: tenant_id
   */
  async publishBillingEvent(event: BillingEvent): Promise<RecordMetadata[]> {
    return this.publish(TOPICS.RAW_BILLING_EVENTS, event.tenant_id, event)
  }

  /**
   * Publish a CostLeakageEvent to events.cost_leakage.
   * Partition key: tenant_id
   */
  async publishCostLeakageEvent(event: CostLeakageEvent): Promise<RecordMetadata[]> {
    return this.publish(TOPICS.COST_LEAKAGE, event.tenant_id, event)
  }

  /**
   * Publish a GovernanceEvent to events.governance.
   * If event_type is KILL_SWITCH_ACTIVATED, also publishes to governance.kill_switch.
   * Partition key: tenant_id
   */
  async publishGovernanceEvent(event: GovernanceEvent): Promise<RecordMetadata[]> {
    const results = await this.publish(TOPICS.GOVERNANCE, event.tenant_id, event)

    if (event.event_type === 'KILL_SWITCH_ACTIVATED') {
      const killSwitchResults = await this.publish(TOPICS.KILL_SWITCH, event.tenant_id, event)
      return [...results, ...killSwitchResults]
    }

    return results
  }

  /**
   * Publish a CarbonEvent to events.carbon.
   * Partition key: tenant_id
   */
  async publishCarbonEvent(event: CarbonEvent): Promise<RecordMetadata[]> {
    return this.publish(TOPICS.CARBON, event.tenant_id, event)
  }

  /**
   * Publish a FinancialModelingEvent to events.financial.
   * Partition key: tenant_id
   */
  async publishFinancialModelingEvent(event: FinancialModelingEvent): Promise<RecordMetadata[]> {
    return this.publish(TOPICS.FINANCIAL, event.tenant_id, event)
  }

  /**
   * Publish an AgentHealthEvent to events.agent_health.
   * Partition key: tenant_id
   */
  async publishAgentHealthEvent(event: AgentHealthEvent): Promise<RecordMetadata[]> {
    return this.publish(TOPICS.AGENT_HEALTH, event.tenant_id, event)
  }

  /**
   * Publish a LedgerWriteEvent to events.ledger_writes.
   * Partition key: tenant_id
   */
  async publishLedgerWriteEvent(event: LedgerWriteEvent): Promise<RecordMetadata[]> {
    return this.publish(TOPICS.LEDGER_WRITES, event.tenant_id, event)
  }

  /**
   * Publish an A2AMessage to events.a2a_messages.
   * Partition key: tenant_id
   */
  async publishA2AMessage(message: A2AMessage): Promise<RecordMetadata[]> {
    return this.publish(TOPICS.A2A_MESSAGES, message.tenant_id, message)
  }

  /**
   * Generic publish method — publishes any event to any topic.
   * @param topic - Target topic name
   * @param partitionKey - Value used for partition assignment (typically tenant_id)
   * @param event - The event payload (must be JSON-serializable)
   */
  async publish(
    topic: TopicName | string,
    partitionKey: string,
    event: EchoEvent | Record<string, unknown>,
  ): Promise<RecordMetadata[]> {
    const producer = await this.getProducer()

    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key: partitionKey,
          value: JSON.stringify(event),
          headers: {
            'content-type': 'application/json',
            'echo-schema-version': '1.0',
          },
        },
      ],
    }

    return producer.send(record)
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect()
      this.producer = null
    }
  }
}
