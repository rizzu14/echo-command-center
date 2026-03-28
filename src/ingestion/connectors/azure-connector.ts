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
// Azure Cost Management REST API types (mocked)
// ---------------------------------------------------------------------------

interface AzureCostQueryResponse {
  properties: {
    rows: Array<[number, string, string, string]> // [cost, currency, resourceType, region]
    columns: Array<{ name: string; type: string }>
    nextLink: string | null
  }
}

async function callAzureCostManagement(
  subscriptionId: string,
  startDate: string,
  endDate: string,
): Promise<AzureCostQueryResponse> {
  // Mock realistic Azure Cost Management /providers/Microsoft.CostManagement/query response
  void subscriptionId
  void startDate
  void endDate
  return {
    properties: {
      columns: [
        { name: 'Cost', type: 'Number' },
        { name: 'Currency', type: 'String' },
        { name: 'ResourceType', type: 'String' },
        { name: 'ResourceLocation', type: 'String' },
      ],
      rows: [
        [9.80, 'USD', 'Microsoft.Compute/virtualMachines', 'eastus'],
        [2.40, 'USD', 'Microsoft.Storage/storageAccounts', 'eastus'],
        [6.10, 'USD', 'Microsoft.Sql/servers', 'westeurope'],
        [1.50, 'USD', 'Microsoft.ContainerService/managedClusters', 'eastus'],
      ],
      nextLink: null,
    },
  }
}

// ---------------------------------------------------------------------------
// AzureCostManagementConnector
// ---------------------------------------------------------------------------

export interface AzureConnectorConfig {
  tenantId: string
  subscriptionId: string
  pollIntervalMs?: number
  requiredTags?: string[]
  onConnectivityFailure?: (event: ConnectivityFailureEvent) => void
}

export class AzureCostManagementConnector implements CloudConnector {
  private readonly tenantId: string
  private readonly subscriptionId: string
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

  constructor(config: AzureConnectorConfig) {
    this.tenantId = config.tenantId
    this.subscriptionId = config.subscriptionId
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
      const response = await callAzureCostManagement(
        this.subscriptionId,
        startDate,
        endDate,
      )
      this.onPollSuccess()

      return response.properties.rows.map(([cost, currency, resourceType, region]) => ({
        provider: 'AZURE' as const,
        raw_resource_id: `azure-${resourceType.replace(/\//g, '-').toLowerCase()}-${region}`,
        raw_resource_type: resourceType,
        region,
        cost_amount: cost,
        cost_currency: currency,
        tags: { tenant_id: this.tenantId, environment: 'production', owner: 'platform' },
        usage_start: startDate,
        usage_end: endDate,
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
    const resourceType = this.classifier.classify('AZURE', raw.raw_resource_type)

    return {
      event_id: randomUUID(),
      tenant_id: this.tenantId,
      provider: 'AZURE',
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
      provider: 'AZURE',
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
        provider: 'AZURE',
        tenant_id: this.tenantId,
        unreachable_since: this.unreachableSince,
        duration_seconds: Math.floor(unreachableMs / 1000),
        timestamp: new Date().toISOString(),
      }
      this.onConnectivityFailure?.(event)
    }
  }
}
