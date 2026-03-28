import { Kafka, Consumer, EachMessagePayload } from 'kafkajs'
import type { EchoEvent } from './producer'

export type MessageHandler<T = EchoEvent> = (
  event: T,
  metadata: { topic: string; partition: number; offset: string },
) => Promise<void>

export interface EchoConsumerConfig {
  brokers: string[]
  /** Consumer group ID — should be scoped per tenant: "{tenant_id}.{service-name}" */
  groupId: string
  clientId?: string
}

/**
 * Typed Kafka consumer for ECHO events.
 *
 * Consumer group isolation: each tenant's agents use a consumer group
 * prefixed with their tenant_id, ensuring they only consume from their
 * own tenant-scoped topics.
 *
 * Usage:
 *   const consumer = new EchoConsumer({ brokers, groupId: 'tenant-abc.auditor-agent' })
 *   await consumer.subscribe(['tenant-abc.cost_leakage'])
 *   await consumer.run(async (event, meta) => { ... })
 */
export class EchoConsumer {
  private readonly kafka: Kafka
  private consumer: Consumer | null = null
  private readonly groupId: string

  constructor(config: EchoConsumerConfig) {
    this.groupId = config.groupId
    this.kafka = new Kafka({
      clientId: config.clientId ?? `echo-consumer-${config.groupId}`,
      brokers: config.brokers,
    })
  }

  private async getConsumer(): Promise<Consumer> {
    if (!this.consumer) {
      this.consumer = this.kafka.consumer({ groupId: this.groupId })
      await this.consumer.connect()
    }
    return this.consumer
  }

  /**
   * Subscribe to one or more topics.
   * @param topics - Topic names to subscribe to
   * @param fromBeginning - Whether to consume from the beginning (default: false)
   */
  async subscribe(topics: string[], fromBeginning = false): Promise<void> {
    const consumer = await this.getConsumer()
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning })
    }
  }

  /**
   * Start consuming messages. Parses JSON payloads and invokes the handler.
   * @param handler - Async function called for each message
   */
  async run(handler: MessageHandler): Promise<void> {
    const consumer = await this.getConsumer()

    await consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, partition, message } = payload

        if (!message.value) return

        let event: EchoEvent
        try {
          event = JSON.parse(message.value.toString()) as EchoEvent
        } catch {
          console.error(`[EchoConsumer] Failed to parse message on ${topic}:${partition}`)
          return
        }

        await handler(event, {
          topic,
          partition,
          offset: message.offset,
        })
      },
    })
  }

  async disconnect(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect()
      this.consumer = null
    }
  }
}
