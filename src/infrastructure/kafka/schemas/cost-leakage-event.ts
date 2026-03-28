export type AnomalyCategory = 'IDLE' | 'OVER_PROVISIONED' | 'ORPHANED' | 'USAGE_SPIKE'

/**
 * Emitted by Auditor_Agent when a spend anomaly is detected.
 * Published to topic: events.cost_leakage
 * Partition key: tenant_id
 */
export interface CostLeakageEvent {
  event_id: string
  tenant_id: string
  resource_id: string
  anomaly_category: AnomalyCategory
  /** Cost in USD per hour at time of detection */
  hourly_cost_usd: number
  /** ISO-8601: when anomaly was detected */
  detection_ts: string
  /** ISO-8601: when event was emitted to Kafka */
  emission_ts: string
  threshold_config: Record<string, unknown>
}

export function isCostLeakageEvent(value: unknown): value is CostLeakageEvent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const validCategories: AnomalyCategory[] = ['IDLE', 'OVER_PROVISIONED', 'ORPHANED', 'USAGE_SPIKE']
  return (
    typeof v['event_id'] === 'string' &&
    typeof v['tenant_id'] === 'string' &&
    typeof v['resource_id'] === 'string' &&
    validCategories.includes(v['anomaly_category'] as AnomalyCategory) &&
    typeof v['hourly_cost_usd'] === 'number' &&
    typeof v['detection_ts'] === 'string' &&
    typeof v['emission_ts'] === 'string' &&
    typeof v['threshold_config'] === 'object' &&
    v['threshold_config'] !== null
  )
}
