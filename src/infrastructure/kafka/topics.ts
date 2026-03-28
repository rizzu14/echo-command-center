/**
 * ECHO Kafka topic name constants and per-tenant topic name generator.
 *
 * Per-tenant topics follow the naming convention: {tenant_id}.{event_type}
 * Kafka ACLs restrict each tenant's producers/consumers to their own prefixed topics only.
 */

/** System-wide (non-tenant-scoped) topic names */
export const TOPICS = {
  /** Normalized billing events from cloud connectors — key: tenant_id */
  RAW_BILLING_EVENTS: 'raw.billing.events',

  /** Anomaly events from Auditor_Agent — key: tenant_id */
  COST_LEAKAGE: 'events.cost_leakage',

  /** Governance events (kill-switch, DoW, containment) — key: tenant_id */
  GOVERNANCE: 'events.governance',

  /** Carbon intensity and scheduling events — key: tenant_id */
  CARBON: 'events.carbon',

  /** Financial modeling, ROI, SLA penalty events — key: tenant_id */
  FINANCIAL: 'events.financial',

  /** Agent health status updates — key: tenant_id */
  AGENT_HEALTH: 'events.agent_health',

  /** Events to be written to Liquid_Ledger — key: tenant_id */
  LEDGER_WRITES: 'events.ledger_writes',

  /** Inter-agent A2A protocol messages — key: tenant_id */
  A2A_MESSAGES: 'events.a2a_messages',

  /**
   * HIGH PRIORITY dedicated kill-switch topic.
   * Dedicated consumer thread on all agents — polled before any other topic.
   * Retention: 1 hour (kill-switch events are acted on immediately).
   */
  KILL_SWITCH: 'governance.kill_switch',
} as const

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS]

/** All standard topics (non-kill-switch) */
export const STANDARD_TOPICS: TopicName[] = [
  TOPICS.RAW_BILLING_EVENTS,
  TOPICS.COST_LEAKAGE,
  TOPICS.GOVERNANCE,
  TOPICS.CARBON,
  TOPICS.FINANCIAL,
  TOPICS.AGENT_HEALTH,
  TOPICS.LEDGER_WRITES,
  TOPICS.A2A_MESSAGES,
]

/**
 * Generate a per-tenant topic name following the convention: {tenant_id}.{event_type}
 *
 * @param tenantId - The tenant UUID (must be non-empty, alphanumeric + hyphens only)
 * @param eventType - The event type suffix (e.g. 'billing.events', 'cost_leakage')
 * @returns Fully qualified tenant-scoped topic name
 */
export function tenantTopic(tenantId: string, eventType: string): string {
  if (!tenantId || !TENANT_ID_PATTERN.test(tenantId)) {
    throw new Error(`Invalid tenant_id: "${tenantId}". Must match pattern: ${TENANT_ID_PATTERN}`)
  }
  if (!eventType || !EVENT_TYPE_PATTERN.test(eventType)) {
    throw new Error(`Invalid eventType: "${eventType}". Must match pattern: ${EVENT_TYPE_PATTERN}`)
  }
  return `${tenantId}.${eventType}`
}

/** Allowed characters in tenant IDs: lowercase alphanumeric and hyphens */
const TENANT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/

/** Allowed characters in event type suffixes: lowercase alphanumeric, dots, underscores, hyphens */
const EVENT_TYPE_PATTERN = /^[a-z0-9][a-z0-9._-]*[a-z0-9]$|^[a-z0-9]$/

/**
 * Extract the tenant_id prefix from a tenant-scoped topic name.
 * Returns null if the topic is not tenant-scoped.
 */
export function extractTenantId(topicName: string): string | null {
  const systemTopics = new Set<string>(Object.values(TOPICS))
  if (systemTopics.has(topicName)) return null

  const dotIndex = topicName.indexOf('.')
  if (dotIndex === -1) return null

  const candidate = topicName.substring(0, dotIndex)
  return TENANT_ID_PATTERN.test(candidate) ? candidate : null
}

/**
 * Returns the ACL resource prefix for a given tenant.
 * Kafka ACLs use prefix matching: tenant producers/consumers are restricted
 * to topics starting with "{tenant_id}."
 */
export function tenantTopicPrefix(tenantId: string): string {
  return `${tenantId}.`
}
