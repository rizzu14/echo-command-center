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
// GCP Cloud Billing API v1 types (mocked)
// ---------------------------------------------------------------------------

interface GcpBillingReport {
  billingAccountId: string
  reportPeriod: { startDate: string; endDate: string }
  lineItems: Array<{
    service: { id: string; description: string }
    sku: { id: string; description: string }
    location: { region: string }
    cost: { amount: number; currency: string }
    labels: Record<string, string>
  }>
}

async function callGcpBillingApi(
  billingAccountId: string,
  startDate: string,
  endDate: string,
): Promise<GcpBillingReport> {
  // Mock realistic GCP Cloud Billing API billingAccounts/{id}/reports response
  void billingAccountId
  return {
    billingAccountId,
    reportPeriod: { startDate, endDate },
    lineItems: [
      {
        service: { id: 'compute', description: 'Compute Engine' },
        sku: { id: 'N1_STANDARD_4', description: 'N1 Standard 4 vCPU' },
        location: { region: 'us-central1' },
        cost: { amount: 11.20, currency: 'USD' },
        labels: { tenant_id: '', environment: 'production', owner: 'platform' },
      },
      {
        service: { id: 'storage', description: 'Cloud Storage' },
        sku: { id: 'REGIONAL_STORAGE', description: 'Regional Storage' },
        location: { region: 'us-central1' },
        cost: { amount: 1.80, currency: 'USD' },
        labels: { tenant_id: '', environment: 'production', owner: 'platform' },
      },
      {
        service: { id: 'bigquery', description: 'BigQuery' },
        sku: { id: 'ANALYSIS', description: 'Analysis' },
        location: { region: 'us-east1' },
        cost: { amount: 4.50, currency: 'USD' },
        labels: { tenant_id: '', environment: 'production', owner: 'platform' },
      },
      {
        service: { id: 'gke', description: 'Google Kubernetes Engine' },
        sku: { id: 'GKE_CLUSTER', description: 'GKE Cluster Management' },
        location: { region: 'us-central1' },
        cost: { amount: 7.30, currency: 'USD' },
        labels: { tenant_id: '', environment: 'production', owner: 'platform' },
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// GcpBillingConnector
// ---------------------------------------------------------------------------

export interface GcpConnectorConfig {
  tenantId: string
  billingAccountId: string
  pollIntervalMs?: number
  requiredTags?: string[]
  onConnectivityFailure?: (event: ConnectivityFailureEvent) => void
}

export class GcpBillingConnector implements CloudConnector {
  private readonly tenantId: string
  private readonly billingAccountId: string
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

  constructor(config: GcpConnectorConfig) {
    this.tenantId = config.tenantId
    this.billingAccountId = config.billingAccountId
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
      const report = await callGcpBillingApi(this.billingAccountId, startDate, endDate)
      this.onPollSuccess()

      return report.lineItems.map((item) => ({
        provider: 'GCP' as const,
        raw_resource_id: `gcp-${item.service.id}-${item.sku.id}-${item.location.region}`.toLowerCase(),
        raw_resource_type: item.service.description,
        region: item.location.region,
        cost_amount: item.cost.amount,
        cost_currency: item.cost.currency,
        tags: {
          ...item.labels,
          tenant_id: this.tenantId, // inject tenant_id from connector config
        },
        usage_start: report.reportPeriod.startDate,
        usage_end: report.reportPeriod.endDate,
      }))
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
    const resourceType = this.classifier.classify('GCP', raw.raw_resource_type)

    return {
      event_id: randomUUID(),
      tenant_id: this.tenantId,
      provider: 'GCP',
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
      provider: 'GCP',
      status: this.status,
      last_successful_poll: this.lastSuccessfulPoll,
      last_error: this.lastError,
      consecutive_failures: this.consecutiveFailures,
    }
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
        provider: 'GCP',
        tenant_id: this.tenantId,
        unreachable_since: this.unreachableSince,
        duration_seconds: Math.floor(unreachableMs / 1000),
        timestamp: new Date().toISOString(),
      }
      this.onConnectivityFailure?.(event)
    }
  }
}
