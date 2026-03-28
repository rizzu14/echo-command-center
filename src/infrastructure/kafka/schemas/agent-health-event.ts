export type AgentStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'ISOLATED' | 'SUSPENDED'

/**
 * Emitted by Agent_Orchestrator for agent health status updates.
 * Published to topic: events.agent_health
 * Partition key: tenant_id
 */
export interface AgentHealthEvent {
  event_id: string
  tenant_id: string
  agent_id: string
  status: AgentStatus
  /** ISO-8601 timestamp */
  timestamp: string
}

export function isAgentHealthEvent(value: unknown): value is AgentHealthEvent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const validStatuses: AgentStatus[] = [
    'HEALTHY',
    'DEGRADED',
    'UNAVAILABLE',
    'ISOLATED',
    'SUSPENDED',
  ]
  return (
    typeof v['event_id'] === 'string' &&
    typeof v['tenant_id'] === 'string' &&
    typeof v['agent_id'] === 'string' &&
    validStatuses.includes(v['status'] as AgentStatus) &&
    typeof v['timestamp'] === 'string'
  )
}
