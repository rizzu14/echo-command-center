export type CloudProvider = 'AWS' | 'AZURE' | 'GCP'

/**
 * Canonical billing event emitted after normalization from cloud provider connectors.
 * Published to topic: raw.billing.events
 * Partition key: tenant_id
 */
export interface BillingEvent {
  event_id: string
  tenant_id: string
  provider: CloudProvider
  resource_id: string
  resource_type: string
  region: string
  /** Cost in USD per hour */
  hourly_cost_usd: number
  tags: Record<string, string>
  /** ISO-8601 timestamp */
  timestamp: string
}

export function isBillingEvent(value: unknown): value is BillingEvent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v['event_id'] === 'string' &&
    typeof v['tenant_id'] === 'string' &&
    (v['provider'] === 'AWS' || v['provider'] === 'AZURE' || v['provider'] === 'GCP') &&
    typeof v['resource_id'] === 'string' &&
    typeof v['resource_type'] === 'string' &&
    typeof v['region'] === 'string' &&
    typeof v['hourly_cost_usd'] === 'number' &&
    typeof v['tags'] === 'object' &&
    v['tags'] !== null &&
    typeof v['timestamp'] === 'string'
  )
}
