/**
 * Emitted by any agent to record an entry in the Liquid_Ledger.
 * Published to topic: events.ledger_writes
 * Partition key: tenant_id
 */
export interface LedgerWriteEvent {
  event_id: string
  tenant_id: string
  entry_type: string
  payload: Record<string, unknown>
  agent_id: string
  /** ISO-8601 timestamp */
  timestamp: string
}

export function isLedgerWriteEvent(value: unknown): value is LedgerWriteEvent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v['event_id'] === 'string' &&
    typeof v['tenant_id'] === 'string' &&
    typeof v['entry_type'] === 'string' &&
    typeof v['payload'] === 'object' &&
    v['payload'] !== null &&
    typeof v['agent_id'] === 'string' &&
    typeof v['timestamp'] === 'string'
  )
}
