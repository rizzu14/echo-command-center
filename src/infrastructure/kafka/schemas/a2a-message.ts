/**
 * Inter-agent A2A protocol message.
 * Published to topic: events.a2a_messages
 * Partition key: tenant_id
 */
export interface A2AMessage {
  message_id: string
  from_agent: string
  to_agent: string
  tenant_id: string
  task_type: string
  payload: Record<string, unknown>
  correlation_id: string
  /** ISO-8601 timestamp */
  timestamp: string
  /** HMAC-SHA256 signature for trust verification */
  signature: string
}

export function isA2AMessage(value: unknown): value is A2AMessage {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v['message_id'] === 'string' &&
    typeof v['from_agent'] === 'string' &&
    typeof v['to_agent'] === 'string' &&
    typeof v['tenant_id'] === 'string' &&
    typeof v['task_type'] === 'string' &&
    typeof v['payload'] === 'object' &&
    v['payload'] !== null &&
    typeof v['correlation_id'] === 'string' &&
    typeof v['timestamp'] === 'string' &&
    typeof v['signature'] === 'string'
  )
}
