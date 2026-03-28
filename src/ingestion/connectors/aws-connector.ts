import { randomUUID } from 'crypto'
import type {
  CloudConnector,
  ConnectorStatus,
  ConnectorStatusCode,
  ConnectivityFailureEvent,
  RawBillingRecord,
} from '../shared/types'
import type { BillingEvent } from '../shared/types'
import { TagValidator } from '../shared/tag-validator'
import { CostNormalizer } from '../shared/cost-normalizer'
import { ResourceClassifier } from '../shared/resource-classifier'

// ---------------------------------------------------------------------------
// AWS SDK types (mocked to avoid requiring live credentials at compile time)
// ---------------------------------------------------------------------------

interface AwsCostResult {
  ResultsByTime: Array<{
    TimePeriod: { Start: string; End: string }
    Groups: Array<{
      Keys: string[]
      Metrics: {
        UnblendedCost: { Amount: string; Unit: string }
      }
    }>
    Total: {
      UnblendedCost?: { Amount: string; Unit: string }
    }
  }>
}

/** Minimal shim — replaced by real @aws-sdk/client-cost-explorer in production */
async function callAwsCostExplorer(
  startDate: string,
  endDate: string,
): Promise<AwsCostResult> {
  // Mock realistic AWS Cost Explorer response structure
  return {
    ResultsByTime: [
      {
        TimePeriod: { Start: startDate, End: endDate },
        Groups: [
          {
            Keys: ['Amazon EC2', 'us-east-1'],
            Metrics: { UnblendedCost: { Amount: '12.50', Unit: 'USD' } },
          },
          {
            Keys: ['Amazon S3', 'us-east-1'],
            Metrics: { UnblendedCost: { Amount: '3.20', Unit: 'USD' } },
          },
          {
            Keys: ['Amazon RDS', 'us-west-2'],
            Metrics: { UnblendedCost: { Amount: '8.75', Unit: 'USD' } },
          },
        ],
        Total: {},
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// AwsCostExplorerConnector
// ---------------------------------------------------------------------------

export interface AwsConnectorConfig {
  tenantId: string
  /** Poll interval in milliseconds — max 60 000 ms per spec */
  pollIntervalMs?: number
  requiredTags?: string[]
  onConnectivityFailure?: (event: ConnectivityFailureEvent) => void
}

export class AwsCostExplorerConnector implements CloudConnector {
  private readonly tenantId: string
  private readonly pollIntervalMs: number
  private readonly tagValidator: TagValidator
  private readonly normalizer: CostNormalizer
  private readonly classifier: ResourceClassifier
  private readonly onConnectivityFailure?: (event: ConnectivityFailureEvent) => void

  private status: ConnectorStatusCode = 'HEALTHY'
  private lastSuccessfulPoll: string | null = null
  private lastError: string | null = null
  private consecutiveFailures = 0
  private unreachableSince: string | null = null

  constructor(config: AwsConnectorConfig) {
    this.tenantId = config.tenantId
    this.pollIntervalMs = Math.min(config.pollIntervalMs ?? 60_000, 60_000)
    this.tagValidator = new TagValidator(config.requiredTags)
    this.normalizer = new CostNormalizer()
    this.classifier = new ResourceClassifier()
    this.onConnectivityFailure = config.onConnectivityFailure
  }

  async poll(): Promise<RawBillingRecord[]> {
    const now = new Date()
    const startDate = new Date(now.getTime() - this.pollIntervalMs)
      .toISOString()
      .split('T')[0]
    const endDate = now.toISOString().split('T')[0]

    try {
      const response = await callAwsCostExplorer(startDate, endDate)
      this.onPollSuccess()

      const records: RawBillingRecord[] = []
      for (const result of response.ResultsByTime) {
        for (const group of result.Groups) {
          const [serviceType, region] = group.Keys
          const amount = parseFloat(group.Metrics.UnblendedCost.Amount)
          const currency = group.Metrics.UnblendedCost.Unit

          records.push({
            provider: 'AWS',
            raw_resource_id: `aws-${serviceType.replace(/\s+/g, '-').toLowerCase()}-${region}`,
            raw_resource_type: serviceType,
            region,
            cost_amount: amount,
            cost_currency: currency,
            tags: { tenant_id: this.tenantId, environment: 'production', owner: 'platform' },
            usage_start: result.TimePeriod.Start,
            usage_end: result.TimePeriod.End,
          })
        }
      }
      return records
    } catch (err) {
      this.onPollFailure(err instanceof Error ? err.message : String(err))
      return []
    }
  }

  normalize(raw: RawBillingRecord): BillingEvent {
    const validation = this.tagValidator.validate(raw.tags, raw.raw_resource_id)
    if (!validation.valid) {
      throw new Error(
        `TagValidation failed for ${raw.raw_resource_id}: missing [${validation.missing_tags.join(', ')}]`,
      )
    }

    const periodHours =
      (new Date(raw.usage_end).getTime() - new Date(raw.usage_start).getTime()) / 3_600_000 || 1

    const hourlyUsd = this.normalizer.toHourlyUsd(raw.cost_amount, raw.cost_currency, periodHours)
    const resourceType = this.classifier.classify('AWS', raw.raw_resource_type)

    return {
      event_id: randomUUID(),
      tenant_id: this.tenantId,
      provider: 'AWS',
      resource_id: raw.raw_resource_id,
      resource_type: resourceType,
      region: raw.region,
      hourly_cost_usd: hourlyUsd,
      tags: raw.tags,
      timestamp: new Date().toISOString(),
    }
  }

  async healthCheck(): Promise<ConnectorStatus> {
    return {
      provider: 'AWS',
      status: this.status,
      last_successful_poll: this.lastSuccessfulPoll,
      last_error: this.lastError,
      consecutive_failures: this.consecutiveFailures,
    }
  }

  get pollInterval(): number {
    return this.pollIntervalMs
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private onPollSuccess(): void {
    this.status = 'HEALTHY'
    this.lastSuccessfulPoll = new Date().toISOString()
    this.lastError = null
    this.consecutiveFailures = 0
    this.unreachableSince = null
  }

  private onPollFailure(errorMessage: string): void {
    this.consecutiveFailures++
    this.lastError = errorMessage
    this.status = 'DEGRADED'

    if (!this.unreachableSince) {
      this.unreachableSince = new Date().toISOString()
    }

    const unreachableMs =
      new Date().getTime() - new Date(this.unreachableSince).getTime()

    if (unreachableMs >= 120_000) {
      this.status = 'UNREACHABLE'
      const event: ConnectivityFailureEvent = {
        event_id: randomUUID(),
        provider: 'AWS',
        tenant_id: this.tenantId,
        unreachable_since: this.unreachableSince,
        duration_seconds: Math.floor(unreachableMs / 1000),
        timestamp: new Date().toISOString(),
      }
      this.onConnectivityFailure?.(event)
    }
  }
}
