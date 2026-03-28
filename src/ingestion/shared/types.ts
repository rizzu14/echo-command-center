export type CloudProvider = 'AWS' | 'AZURE' | 'GCP'

/**
 * Canonical billing event — mirrors the schema in infrastructure/kafka/schemas/billing-event.ts.
 * Published to topic: raw.billing.events, partition key: tenant_id
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

export type ConnectorStatusCode = 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE'

export interface ConnectorStatus {
  provider: string
  status: ConnectorStatusCode
  last_successful_poll: string | null
  last_error: string | null
  consecutive_failures: number
}

export interface ConnectivityFailureEvent {
  event_id: string
  provider: string
  tenant_id: string
  unreachable_since: string
  duration_seconds: number
  timestamp: string
}

export interface RawBillingRecord {
  provider: 'AWS' | 'AZURE' | 'GCP'
  raw_resource_id: string
  raw_resource_type: string
  region: string
  cost_amount: number
  cost_currency: string
  tags: Record<string, string>
  usage_start: string
  usage_end: string
}

export interface CloudConnector {
  poll(): Promise<RawBillingRecord[]>
  normalize(raw: RawBillingRecord): BillingEvent
  healthCheck(): Promise<ConnectorStatus>
}

export interface CarbonIntensityReading {
  region: string
  intensity_gco2_per_kwh: number
  forecast_horizon_hours: number
  timestamp: string
}

export interface DataStalenessWarning {
  event_id: string
  region: string
  stale_since: string
  duration_minutes: number
  last_known_intensity: number
  timestamp: string
}
