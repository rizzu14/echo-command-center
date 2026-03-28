import { randomUUID } from 'crypto'
import type { BillingEvent, RawBillingRecord, ConnectivityFailureEvent } from '../shared/types'
import { TagValidator } from '../shared/tag-validator'
import { CostNormalizer } from '../shared/cost-normalizer'
import { ResourceClassifier } from '../shared/resource-classifier'
import { AwsCostExplorerConnector } from '../connectors/aws-connector'
import { AzureCostManagementConnector } from '../connectors/azure-connector'
import { GcpBillingConnector } from '../connectors/gcp-connector'

// ---------------------------------------------------------------------------
// Dead-letter queue entry
// ---------------------------------------------------------------------------

export interface DeadLetterEntry {
  id: string
  raw_record: RawBillingRecord
  error: string
  failed_at: string
}

// ---------------------------------------------------------------------------
// Kafka producer interface (minimal — wired to real EchoProducer in production)
// ---------------------------------------------------------------------------

export interface BillingEventProducer {
  publishBillingEvent(event: BillingEvent): Promise<unknown>
}

/** No-op producer used when no Kafka producer is configured */
class NoOpProducer implements BillingEventProducer {
  async publishBillingEvent(_event: BillingEvent): Promise<void> {
    // no-op
  }
}

// ---------------------------------------------------------------------------
// Pipeline configuration
// ---------------------------------------------------------------------------

export interface PipelineConfig {
  tenantId: string
  awsBillingAccountId?: string
  azureSubscriptionId?: string
  gcpBillingAccountId?: string
  pollIntervalMs?: number
  requiredTags?: string[]
  producer?: BillingEventProducer
  onConnectivityFailure?: (event: ConnectivityFailureEvent) => void
  onDeadLetter?: (entry: DeadLetterEntry) => void
}

// ---------------------------------------------------------------------------
// DataNormalizationPipeline
// ---------------------------------------------------------------------------

export class DataNormalizationPipeline {
  private readonly tenantId: string
  private readonly tagValidator: TagValidator
  private readonly costNormalizer: CostNormalizer
  private readonly resourceClassifier: ResourceClassifier
  private readonly producer: BillingEventProducer
  private readonly onDeadLetter?: (entry: DeadLetterEntry) => void

  private readonly awsConnector: AwsCostExplorerConnector | null
  private readonly azureConnector: AzureCostManagementConnector | null
  private readonly gcpConnector: GcpBillingConnector | null

  private readonly deadLetterQueue: DeadLetterEntry[] = []

  constructor(config: PipelineConfig) {
    this.tenantId = config.tenantId
    this.tagValidator = new TagValidator(config.requiredTags)
    this.costNormalizer = new CostNormalizer()
    this.resourceClassifier = new ResourceClassifier()
    this.producer = config.producer ?? new NoOpProducer()
    this.onDeadLetter = config.onDeadLetter

    const connectorBase = {
      tenantId: config.tenantId,
      pollIntervalMs: config.pollIntervalMs,
      requiredTags: config.requiredTags,
      onConnectivityFailure: config.onConnectivityFailure,
    }

    this.awsConnector = config.awsBillingAccountId !== undefined
      ? new AwsCostExplorerConnector(connectorBase)
      : null

    this.azureConnector = config.azureSubscriptionId !== undefined
      ? new AzureCostManagementConnector({
          ...connectorBase,
          subscriptionId: config.azureSubscriptionId,
        })
      : null

    this.gcpConnector = config.gcpBillingAccountId !== undefined
      ? new GcpBillingConnector({
          ...connectorBase,
          billingAccountId: config.gcpBillingAccountId,
        })
      : null
  }

  /**
   * Run one full ingestion cycle across all configured connectors.
   * Returns the list of successfully published BillingEvents.
   */
  async run(): Promise<BillingEvent[]> {
    const allRaw: RawBillingRecord[] = []

    if (this.awsConnector) {
      const records = await this.awsConnector.poll()
      allRaw.push(...records)
    }
    if (this.azureConnector) {
      const records = await this.azureConnector.poll()
      allRaw.push(...records)
    }
    if (this.gcpConnector) {
      const records = await this.gcpConnector.poll()
      allRaw.push(...records)
    }

    const published: BillingEvent[] = []

    for (const raw of allRaw) {
      const event = this.processRecord(raw)
      if (event) {
        await this.producer.publishBillingEvent(event)
        published.push(event)
      }
    }

    return published
  }

  /**
   * Process a single raw record through the full normalization pipeline:
   * RawBillingRecord → TagValidator → CostNormalizer → ResourceClassifier → BillingEvent
   *
   * Returns null and routes to dead-letter queue on failure.
   */
  processRecord(raw: RawBillingRecord): BillingEvent | null {
    try {
      // Step 1: Tag validation
      const tagResult = this.tagValidator.validate(raw.tags, raw.raw_resource_id)
      if (!tagResult.valid) {
        throw new Error(
          `Missing required tags: [${tagResult.missing_tags.join(', ')}]`,
        )
      }

      // Step 2: Cost normalization (USD conversion)
      const periodHours =
        (new Date(raw.usage_end).getTime() - new Date(raw.usage_start).getTime()) / 3_600_000 || 1
      const hourlyUsd = this.costNormalizer.toHourlyUsd(
        raw.cost_amount,
        raw.cost_currency,
        periodHours,
      )

      // Step 3: Resource classification (canonical taxonomy)
      const resourceType = this.resourceClassifier.classify(raw.provider, raw.raw_resource_type)

      // Step 4: Assemble canonical BillingEvent
      const event: BillingEvent = {
        event_id: randomUUID(),
        tenant_id: this.tenantId,
        provider: raw.provider,
        resource_id: raw.raw_resource_id,
        resource_type: resourceType,
        region: raw.region,
        hourly_cost_usd: hourlyUsd,
        tags: raw.tags,
        timestamp: new Date().toISOString(),
      }

      return event
    } catch (err) {
      this.routeToDeadLetter(raw, err instanceof Error ? err.message : String(err))
      return null
    }
  }

  /** Returns all entries currently in the dead-letter queue */
  getDeadLetterQueue(): DeadLetterEntry[] {
    return [...this.deadLetterQueue]
  }

  /** Drain and return all dead-letter entries, clearing the queue */
  drainDeadLetterQueue(): DeadLetterEntry[] {
    return this.deadLetterQueue.splice(0)
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private routeToDeadLetter(raw: RawBillingRecord, error: string): void {
    const entry: DeadLetterEntry = {
      id: randomUUID(),
      raw_record: raw,
      error,
      failed_at: new Date().toISOString(),
    }
    this.deadLetterQueue.push(entry)
    this.onDeadLetter?.(entry)
    console.error(`[DataNormalizationPipeline] Dead-letter: ${error}`, {
      resource_id: raw.raw_resource_id,
      provider: raw.provider,
    })
  }
}
