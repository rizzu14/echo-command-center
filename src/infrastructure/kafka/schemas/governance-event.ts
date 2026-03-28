export type GovernanceEventType =
  | 'KILL_SWITCH_ACTIVATED'
  | 'DOW_LIMIT_EXCEEDED'
  | 'AGENT_ISOLATED'
  | 'INJECTION_DETECTED'

/**
 * Emitted by Governor_Agent for governance-related events.
 * Published to topics: events.governance and governance.kill_switch (for KILL_SWITCH_ACTIVATED)
 * Partition key: tenant_id
 */
export interface GovernanceEvent {
  event_id: string
  tenant_id: string
  event_type: GovernanceEventType
  payload: Record<string, unknown>
  /** ISO-8601 timestamp */
  timestamp: string
}

export function isGovernanceEvent(value: unknown): value is GovernanceEvent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const validTypes: GovernanceEventType[] = [
    'KILL_SWITCH_ACTIVATED',
    'DOW_LIMIT_EXCEEDED',
    'AGENT_ISOLATED',
    'INJECTION_DETECTED',
  ]
  return (
    typeof v['event_id'] === 'string' &&
    typeof v['tenant_id'] === 'string' &&
    validTypes.includes(v['event_type'] as GovernanceEventType) &&
    typeof v['payload'] === 'object' &&
    v['payload'] !== null &&
    typeof v['timestamp'] === 'string'
  )
}
