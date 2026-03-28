export type FinancialModelingEventType =
  | 'PLAYBOOK_GENERATED'
  | 'ROI_CALCULATED'
  | 'PENALTY_PROJECTED'
  | 'VARIANCE_FLAGGED'

/**
 * Emitted by Finance_Agent for financial modeling events.
 * Published to topic: events.financial
 * Partition key: tenant_id
 */
export interface FinancialModelingEvent {
  event_id: string
  tenant_id: string
  event_type: FinancialModelingEventType
  payload: Record<string, unknown>
  /** ISO-8601 timestamp */
  timestamp: string
}

export function isFinancialModelingEvent(value: unknown): value is FinancialModelingEvent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const validTypes: FinancialModelingEventType[] = [
    'PLAYBOOK_GENERATED',
    'ROI_CALCULATED',
    'PENALTY_PROJECTED',
    'VARIANCE_FLAGGED',
  ]
  return (
    typeof v['event_id'] === 'string' &&
    typeof v['tenant_id'] === 'string' &&
    validTypes.includes(v['event_type'] as FinancialModelingEventType) &&
    typeof v['payload'] === 'object' &&
    v['payload'] !== null &&
    typeof v['timestamp'] === 'string'
  )
}
