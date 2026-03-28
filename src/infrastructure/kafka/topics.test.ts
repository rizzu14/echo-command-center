import {
  TOPICS,
  tenantTopic,
  extractTenantId,
  tenantTopicPrefix,
  STANDARD_TOPICS,
} from './topics'

describe('TOPICS constants', () => {
  it('defines all required system topics', () => {
    expect(TOPICS.RAW_BILLING_EVENTS).toBe('raw.billing.events')
    expect(TOPICS.COST_LEAKAGE).toBe('events.cost_leakage')
    expect(TOPICS.GOVERNANCE).toBe('events.governance')
    expect(TOPICS.CARBON).toBe('events.carbon')
    expect(TOPICS.FINANCIAL).toBe('events.financial')
    expect(TOPICS.AGENT_HEALTH).toBe('events.agent_health')
    expect(TOPICS.LEDGER_WRITES).toBe('events.ledger_writes')
    expect(TOPICS.A2A_MESSAGES).toBe('events.a2a_messages')
    expect(TOPICS.KILL_SWITCH).toBe('governance.kill_switch')
  })

  it('has 9 total topics', () => {
    expect(Object.keys(TOPICS)).toHaveLength(9)
  })

  it('STANDARD_TOPICS excludes kill_switch', () => {
    expect(STANDARD_TOPICS).not.toContain(TOPICS.KILL_SWITCH)
    expect(STANDARD_TOPICS).toHaveLength(8)
  })
})

describe('tenantTopic()', () => {
  it('generates correct per-tenant topic name', () => {
    expect(tenantTopic('tenant-abc', 'billing.events')).toBe('tenant-abc.billing.events')
    expect(tenantTopic('acme-corp', 'cost_leakage')).toBe('acme-corp.cost_leakage')
    expect(tenantTopic('t1', 'governance')).toBe('t1.governance')
  })

  it('follows {tenant_id}.{event_type} convention', () => {
    const tenantId = 'my-tenant-123'
    const eventType = 'billing.events'
    const result = tenantTopic(tenantId, eventType)
    expect(result).toBe(`${tenantId}.${eventType}`)
    expect(result.startsWith(`${tenantId}.`)).toBe(true)
  })

  it('throws on empty tenant_id', () => {
    expect(() => tenantTopic('', 'billing.events')).toThrow()
  })

  it('throws on invalid tenant_id with uppercase', () => {
    expect(() => tenantTopic('TENANT-ABC', 'billing.events')).toThrow()
  })

  it('throws on tenant_id with spaces', () => {
    expect(() => tenantTopic('tenant abc', 'billing.events')).toThrow()
  })

  it('throws on empty event type', () => {
    expect(() => tenantTopic('tenant-abc', '')).toThrow()
  })

  it('throws on event type with spaces', () => {
    expect(() => tenantTopic('tenant-abc', 'billing events')).toThrow()
  })

  it('accepts single-character tenant_id', () => {
    expect(tenantTopic('a', 'x')).toBe('a.x')
  })
})

describe('extractTenantId()', () => {
  it('returns null for system topics', () => {
    expect(extractTenantId(TOPICS.RAW_BILLING_EVENTS)).toBeNull()
    expect(extractTenantId(TOPICS.KILL_SWITCH)).toBeNull()
    expect(extractTenantId(TOPICS.GOVERNANCE)).toBeNull()
  })

  it('extracts tenant_id from tenant-scoped topic', () => {
    expect(extractTenantId('tenant-abc.billing.events')).toBe('tenant-abc')
    expect(extractTenantId('acme-corp.cost_leakage')).toBe('acme-corp')
    expect(extractTenantId('t1.governance')).toBe('t1')
  })

  it('returns null for topic with no dot', () => {
    expect(extractTenantId('notenant')).toBeNull()
  })
})

describe('tenantTopicPrefix()', () => {
  it('returns prefix with trailing dot', () => {
    expect(tenantTopicPrefix('tenant-abc')).toBe('tenant-abc.')
    expect(tenantTopicPrefix('acme')).toBe('acme.')
  })

  it('prefix matches all tenant topics', () => {
    const tenantId = 'my-tenant'
    const prefix = tenantTopicPrefix(tenantId)
    const topic = tenantTopic(tenantId, 'billing.events')
    expect(topic.startsWith(prefix)).toBe(true)
  })
})
