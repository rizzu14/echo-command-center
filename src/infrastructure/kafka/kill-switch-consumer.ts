import { Kafka, Consumer, EachMessagePayload } from 'kafkajs'
import { TOPICS } from './topics'
import type { GovernanceEvent } from './schemas'

export type KillSwitchHandler = (
  event: GovernanceEvent,
  metadata: { partition: number; offset: string },
) => Promise<void>

export interface KillSwitchConsumerConfig {
  brokers: string[]
  /** Agent identifier — used to build a unique consumer group per agent instance */
  agentId: string
  clientId?: string
}

/**
 * Dedicated high-priority kill-switch consumer.
 *
 * This consumer runs on a SEPARATE thread/process from normal event processing.
 * It polls governance.kill_switch BEFORE any other topic is polled.
 *
 * Design requirements:
 * - Separate dedicated consumer (not shared with normal event processing)
 * - Higher priority: this consumer must be started and checked before other consumers
 * - Short retention topic (1 hour) — kill-switch events are acted on immediately
 * - Each agent instance has its own consumer group to ensure every agent receives
 *   every kill-switch event (broadcast semantics, not load-balanced)
 *
 * Usage:
 *   const ks = new KillSwitchConsumer({ brokers, agentId: 'auditor-agent-tenant-abc' })
 *   await ks.start(async (event) => {
 *     await agent.halt()
 *   })
 */
export class KillSwitchConsumer {
  private readonly kafka: Kafka
  private consumer: Consumer | null = null
  private readonly consumerGroupId: string
  private running = false

  constructor(config: KillSwitchConsumerConfig) {
    // Each agent instance gets its own consumer group so ALL agents receive
    // every kill-switch event (broadcast, not competing consumers)
    this.consumerGroupId = `kill-switch.${config.agentId}`

    this.kafka = new Kafka({
      clientId: config.clientId ?? `echo-kill-switch-${config.agentId}`,
      brokers: config.brokers,
    })
  }

  /**
   * Start the dedicated kill-switch consumer.
   * This should be called BEFORE starting any normal event consumers.
   *
   * @param handler - Called immediately when a kill-switch event is received
   */
  async start(handler: KillSwitchHandler): Promise<void> {
    if (this.running) return

    this.consumer = this.kafka.consumer({
      groupId: this.consumerGroupId,
      // Minimal session timeout for fast failover detection
      sessionTimeout: 10000,
      heartbeatInterval: 3000,
    })

    await this.consumer.connect()
    await this.consumer.subscribe({
      topic: TOPICS.KILL_SWITCH,
      fromBeginning: false,
    })

    this.running = true

    await this.consumer.run({
      // Process kill-switch messages one at a time — no batching
      eachMessage: async (payload: EachMessagePayload) => {
        const { partition, message } = payload

        if (!message.value) return

        let event: GovernanceEvent
        try {
          event = JSON.parse(message.value.toString()) as GovernanceEvent
        } catch {
          console.error('[KillSwitchConsumer] Failed to parse kill-switch message — ignoring')
          return
        }

        // Invoke handler immediately — no queuing, no batching
        await handler(event, {
          partition,
          offset: message.offset,
        })
      },
    })
  }

  get isRunning(): boolean {
    return this.running
  }

  async stop(): Promise<void> {
    if (this.consumer) {
      this.running = false
      await this.consumer.disconnect()
      this.consumer = null
    }
  }
}
