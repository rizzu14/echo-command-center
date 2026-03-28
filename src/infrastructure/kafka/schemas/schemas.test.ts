import {
  isBillingEvent,
  isCostLeakageEvent,
  isGovernanceEvent,
  isCarbonEvent,
  isFinancialModelingEvent,
  isAgentHealthEvent,
  isLedgerWriteEvent,
  isA2AMessage,
} from './index'

describe('BillingEvent schema validation', () => {
  const valid = {
    event_id: 'evt-001',
    tenant_id: 'tenant-abc',
    provider: 'AWS',
    resource_id: 'i-1234567890abcdef0',
    resource_type: 'EC2_INSTANCE',
    region: 'us-east-1',
    hourly_cost_usd: 0.096,
    tags: { env: 'prod', team: 'platform' },
    timestamp: '2024-01-15T10:00:00Z',
  }

  it('accepts a valid BillingEvent', () => {
    expect(isBillingEvent(valid)).toBe(true)
  })

  it('accepts all three cloud providers', () => {
    expect(isBillingEvent({ ...valid, provider: 'AWS' })).toBe(true)
    expect(isBillingEvent({ ...valid, provider: 'AZURE' })).toBe(true)
    expect(isBillingEvent({ ...valid, provider: 'GCP' })).toBe(true)
  })

  it('rejects unknown provider', () => {
    expect(isBillingEvent({ ...valid, provider: 'ORACLE' })).toBe(false)
  })

  it('rejects missing required fields', () => {
    const { event_id: _, ...withoutId } = valid
    expect(isBillingEvent(withoutId)).toBe(false)
  })

  it('rejects null', () => {
    expect(isBillingEvent(null)).toBe(false)
  })
})

describe('CostLeakageEvent schema validation', () => {
  const valid = {
    event_id: 'evt-002',
    tenant_id: 'tenant-abc',
    resource_id: 'i-1234567890abcdef0',
    anomaly_category: 'IDLE',
    hourly_cost_usd: 0.096,
    detection_ts: '2024-01-15T10:00:00Z',
    emission_ts: '2024-01-15T10:00:05Z',
    threshold_config: { idle_hours: 48 },
  }

  it('accepts a valid CostLeakageEvent', () => {
    expect(isCostLeakageEvent(valid)).toBe(true)
  })

  it('accepts all four anomaly categories', () => {
    const categories = ['IDLE', 'OVER_PROVISIONED', 'ORPHANED', 'USAGE_SPIKE']
    for (const cat of categories) {
      expect(isCostLeakageEvent({ ...valid, anomaly_category: cat })).toBe(true)
    }
  })

  it('rejects invalid anomaly_category', () => {
    expect(isCostLeakageEvent({ ...valid, anomaly_category: 'UNKNOWN' })).toBe(false)
  })
})

describe('GovernanceEvent schema validation', () => {
  const valid = {
    event_id: 'evt-003',
    tenant_id: 'tenant-abc',
    event_type: 'KILL_SWITCH_ACTIVATED',
    payload: { activated_by: 'user-123' },
    timestamp: '2024-01-15T10:00:00Z',
  }

  it('accepts a valid GovernanceEvent', () => {
    expect(isGovernanceEvent(valid)).toBe(true)
  })

  it('accepts all four governance event types', () => {
    const types = ['KILL_SWITCH_ACTIVATED', 'DOW_LIMIT_EXCEEDED', 'AGENT_ISOLATED', 'INJECTION_DETECTED']
    for (const t of types) {
      expect(isGovernanceEvent({ ...valid, event_type: t })).toBe(true)
    }
  })

  it('rejects invalid event_type', () => {
    expect(isGovernanceEvent({ ...valid, event_type: 'UNKNOWN' })).toBe(false)
  })
})

describe('CarbonEvent schema validation', () => {
  const valid = {
    event_id: 'evt-004',
    tenant_id: 'tenant-abc',
    event_type: 'CARBON_INTENSITY_UPDATE',
    payload: { region: 'us-east-1', intensity_gco2_per_kwh: 350 },
    timestamp: '2024-01-15T10:00:00Z',
  }

  it('accepts a valid CarbonEvent', () => {
    expect(isCarbonEvent(valid)).toBe(true)
  })

  it('accepts all three carbon event types', () => {
    const types = ['CARBON_INTENSITY_UPDATE', 'WORKLOAD_SCHEDULED', 'DATA_STALENESS_WARNING']
    for (const t of types) {
      expect(isCarbonEvent({ ...valid, event_type: t })).toBe(true)
    }
  })

  it('rejects invalid event_type', () => {
    expect(isCarbonEvent({ ...valid, event_type: 'UNKNOWN' })).toBe(false)
  })
})

describe('FinancialModelingEvent schema validation', () => {
  const valid = {
    event_id: 'evt-005',
    tenant_id: 'tenant-abc',
    event_type: 'ROI_CALCULATED',
    payload: { action_id: 'act-001', roi_pct: 42.5 },
    timestamp: '2024-01-15T10:00:00Z',
  }

  it('accepts a valid FinancialModelingEvent', () => {
    expect(isFinancialModelingEvent(valid)).toBe(true)
  })

  it('accepts all four financial event types', () => {
    const types = ['PLAYBOOK_GENERATED', 'ROI_CALCULATED', 'PENALTY_PROJECTED', 'VARIANCE_FLAGGED']
    for (const t of types) {
      expect(isFinancialModelingEvent({ ...valid, event_type: t })).toBe(true)
    }
  })
})

describe('AgentHealthEvent schema validation', () => {
  const valid = {
    event_id: 'evt-006',
    tenant_id: 'tenant-abc',
    agent_id: 'auditor-agent-1',
    status: 'HEALTHY',
    timestamp: '2024-01-15T10:00:00Z',
  }

  it('accepts a valid AgentHealthEvent', () => {
    expect(isAgentHealthEvent(valid)).toBe(true)
  })

  it('accepts all five agent statuses', () => {
    const statuses = ['HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'ISOLATED', 'SUSPENDED']
    for (const s of statuses) {
      expect(isAgentHealthEvent({ ...valid, status: s })).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    expect(isAgentHealthEvent({ ...valid, status: 'UNKNOWN' })).toBe(false)
  })
})

describe('LedgerWriteEvent schema validation', () => {
  const valid = {
    event_id: 'evt-007',
    tenant_id: 'tenant-abc',
    entry_type: 'KILL_SWITCH_ACTIVATION',
    payload: { activated_by: 'user-123' },
    agent_id: 'governor-agent-1',
    timestamp: '2024-01-15T10:00:00Z',
  }

  it('accepts a valid LedgerWriteEvent', () => {
    expect(isLedgerWriteEvent(valid)).toBe(true)
  })

  it('rejects missing agent_id', () => {
    const { agent_id: _, ...withoutAgent } = valid
    expect(isLedgerWriteEvent(withoutAgent)).toBe(false)
  })
})

describe('A2AMessage schema validation', () => {
  const valid = {
    message_id: 'msg-001',
    from_agent: 'auditor-agent-1',
    to_agent: 'governor-agent-1',
    tenant_id: 'tenant-abc',
    task_type: 'ANOMALY_REVIEW',
    payload: { anomaly_id: 'anom-001' },
    correlation_id: 'corr-001',
    timestamp: '2024-01-15T10:00:00Z',
    signature: 'hmac-sha256-abc123',
  }

  it('accepts a valid A2AMessage', () => {
    expect(isA2AMessage(valid)).toBe(true)
  })

  it('rejects missing signature', () => {
    const { signature: _, ...withoutSig } = valid
    expect(isA2AMessage(withoutSig)).toBe(false)
  })

  it('rejects missing correlation_id', () => {
    const { correlation_id: _, ...withoutCorr } = valid
    expect(isA2AMessage(withoutCorr)).toBe(false)
  })
})
