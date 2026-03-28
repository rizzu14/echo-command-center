export type CarbonEventType =
  | 'CARBON_INTENSITY_UPDATE'
  | 'WORKLOAD_SCHEDULED'
  | 'DATA_STALENESS_WARNING'

/**
 * Emitted by Green_Architect_Agent for carbon-related events.
 * Published to topic: events.carbon
 * Partition key: tenant_id
 */
export interface CarbonEvent {
  event_id: string
  tenant_id: string
  event_type: CarbonEventType
  payload: Record<string, unknown>
  /** ISO-8601 timestamp */
  timestamp: string
}

export function isCarbonEvent(value: unknown): value is CarbonEvent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const validTypes: CarbonEventType[] = [
    'CARBON_INTENSITY_UPDATE',
    'WORKLOAD_SCHEDULED',
    'DATA_STALENESS_WARNING',
  ]
  return (
    typeof v['event_id'] === 'string' &&
    typeof v['tenant_id'] === 'string' &&
    validTypes.includes(v['event_type'] as CarbonEventType) &&
    typeof v['payload'] === 'object' &&
    v['payload'] !== null &&
    typeof v['timestamp'] === 'string'
  )
}
