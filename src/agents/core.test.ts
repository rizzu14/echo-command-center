/**
 * Comprehensive tests for ECHO core engine components.
 * Tasks 27-32, 36-41, 43-48, 59-65, 67-72, 74-78
 */

// ─── SLA Prevention ───────────────────────────────────────────────────────────
import { ContractDigitalTwin } from './sla/contract-digital-twin.js'
import { PenaltyCalculator } from './sla/penalty-calculator.js'

// ─── Execution Engine ─────────────────────────────────────────────────────────
import { DigitalTwin } from '../execution/digital-twin.js'
import { RiskScorer } from '../execution/risk-scorer.js'
import { ApprovalRouter } from '../execution/approval-router.js'
import { RollbackManager } from '../execution/rollback-manager.js'
import { AgenticPlanCache } from '../execution/agentic-plan-cache.js'

// ─── Finance ──────────────────────────────────────────────────────────────────
import { ROIEngine } from './finance/roi-engine.js'
import { TransactionReconciler } from './finance/transaction-reconciler.js'
import { VarianceAnalyzer } from './finance/variance-analyzer.js'

// ─── Reasoning ────────────────────────────────────────────────────────────────
import { ReasoningRouter } from '../reasoning/reasoning-router.js'
import { ModelProviderRouter, FastModelProvider } from '../reasoning/model-provider.js'
import { HallucinationDetector } from '../reasoning/hallucination-detector.js'
import { DualChainProcessor } from '../reasoning/dual-chain-processor.js'
import { CostTracker } from '../reasoning/cost-tracker.js'

// ─── Carbon ───────────────────────────────────────────────────────────────────
import { CarbonAwareScheduler, CO2eSavingsCalculator } from './green/carbon-scheduler.js'

// ─── Ledger ───────────────────────────────────────────────────────────────────
import { LiquidLedger } from '../ledger/liquid-ledger.js'

// ─── Security ─────────────────────────────────────────────────────────────────
import { RBACMiddleware } from '../security/rbac.js'
import { APIKeyManager } from '../security/api-key-manager.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeContract(overrides: Record<string, unknown> = {}) {
  return {
    contract_id: 'c-1',
    tenant_id: 'tenant-a',
    vendor_name: 'AWS',
    service_name: 'EC2',
    terms: [{ metric_name: 'latency_ms', threshold: 100, unit: 'ms' }],
    penalty_schedule: { monthly_fee_usd: 10000, minor_pct: 5, major_pct: 15 },
    ...overrides,
  }
}

function makeSnapshot() {
  return {
    tenant_id: 'tenant-a',
    resources: {
      'res-1': {
        resource_id: 'res-1',
        resource_type: 'EC2',
        current_cost_usd_per_hour: 1.0,
        utilization_pct: 10,
        region: 'us-east-1',
        tags: {},
        metadata: {},
      },
    },
    captured_at: new Date().toISOString(),
  }
}

function makeAction(overrides: Record<string, unknown> = {}) {
  return {
    action_id: 'act-1',
    action_type: 'SCALE_DOWN',
    resource_id: 'res-1',
    parameters: { scale_factor: 0.5 },
    projected_savings_usd: 360,
    projected_roi: 10,
    ...overrides,
  }
}

// ─── ContractDigitalTwin ──────────────────────────────────────────────────────

describe('ContractDigitalTwin', () => {
  test('ingests valid contract and returns HEALTHY model', () => {
    const twin = new ContractDigitalTwin()
    const model = twin.ingestContract(makeContract())
    expect(model.state).toBe('HEALTHY')
    expect(model.contract.contract_id).toBe('c-1')
  })

  test('rejects malformed contract with descriptive error', () => {
    const twin = new ContractDigitalTwin()
    expect(() => twin.ingestContract({ contract_id: 'x' })).toThrow(/tenant_id/)
  })

  test('leaves existing models unchanged on parse failure', () => {
    const twin = new ContractDigitalTwin()
    twin.ingestContract(makeContract())
    try { twin.ingestContract({ contract_id: 'c-1' }) } catch {}
    const model = twin.getModel('c-1')
    expect(model).toBeDefined()
    expect(model!.contract.vendor_name).toBe('AWS')
  })

  test('transitions HEALTHY → WARNING at 90% threshold', async () => {
    const warnings: unknown[] = []
    const twin = new ContractDigitalTwin({ emitWarning: async (e) => { warnings.push(e) } })
    twin.ingestContract(makeContract())
    const model = await twin.evaluateContract('c-1', { latency_ms: 91 }) // 91% of 100
    expect(model.state).toBe('WARNING')
    expect(warnings).toHaveLength(1)
  })

  test('transitions WARNING → BREACHED at threshold', async () => {
    const ledger: unknown[] = []
    const twin = new ContractDigitalTwin({ writeLedger: async (e) => { ledger.push(e) } })
    twin.ingestContract(makeContract())
    await twin.evaluateContract('c-1', { latency_ms: 91 }) // WARNING
    const model = await twin.evaluateContract('c-1', { latency_ms: 100 }) // BREACHED
    expect(model.state).toBe('BREACHED')
    expect(ledger).toHaveLength(1)
  })

  test('calculatePenaltyExposure uses monthly_fee * major_pct / 100', () => {
    const twin = new ContractDigitalTwin()
    const contract = makeContract() as Parameters<typeof twin.ingestContract>[0]
    twin.ingestContract(contract)
    const penalty = twin.calculatePenaltyExposure(contract as any)
    expect(penalty).toBeCloseTo(10000 * 0.15)
  })

  test('emits PreBreachWarningEvent before threshold crossed', async () => {
    const warnings: any[] = []
    const twin = new ContractDigitalTwin({ emitWarning: async (e) => { warnings.push(e) } })
    twin.ingestContract(makeContract())
    await twin.evaluateContract('c-1', { latency_ms: 95 })
    expect(warnings[0].event_type).toBe('PRE_BREACH_WARNING')
    expect(warnings[0].current_value).toBe(95)
    expect(warnings[0].threshold_value).toBe(100)
  })
})

// ─── PenaltyCalculator ────────────────────────────────────────────────────────

describe('PenaltyCalculator', () => {
  const calc = new PenaltyCalculator()

  test('calculates penalty = monthly_fee * penalty_pct / 100', () => {
    const contract = makeContract() as any
    const breach = { contract_id: 'c-1', metric_name: 'latency_ms', breach_duration_seconds: 100, magnitude_pct: 5 }
    const result = calc.calculate(contract, breach)
    expect(result.estimated_penalty_usd).toBeCloseTo(10000 * 0.05)
    expect(result.penalty_math.formula_string).toContain('penalty')
  })

  test('attaches penalty_math with all required fields', () => {
    const contract = makeContract() as any
    const breach = { contract_id: 'c-1', metric_name: 'latency_ms', breach_duration_seconds: 7200, magnitude_pct: 30 }
    const result = calc.calculate(contract, breach)
    expect(result.penalty_math.monthly_fee_usd).toBe(10000)
    expect(result.penalty_math.penalty_pct).toBeDefined()
    expect(result.penalty_math.severity).toBeDefined()
    expect(result.penalty_math.formula_string).toBeTruthy()
    expect(result.penalty_math.estimated_penalty_usd).toBeGreaterThan(0)
  })

  test('classifies MAJOR breach for long duration', () => {
    const contract = makeContract() as any
    const breach = { contract_id: 'c-1', metric_name: 'latency_ms', breach_duration_seconds: 7200, magnitude_pct: 5 }
    const result = calc.calculate(contract, breach)
    expect(result.penalty_math.severity).toBe('MAJOR')
  })

  test('classifies MINOR breach for short duration', () => {
    const contract = makeContract() as any
    const breach = { contract_id: 'c-1', metric_name: 'latency_ms', breach_duration_seconds: 60, magnitude_pct: 5 }
    const result = calc.calculate(contract, breach)
    expect(result.penalty_math.severity).toBe('MINOR')
  })
})

// ─── DigitalTwin ──────────────────────────────────────────────────────────────

describe('DigitalTwin', () => {
  test('simulate returns SimulationResult without modifying state', () => {
    const twin = new DigitalTwin()
    twin.setState(makeSnapshot())
    const action = makeAction()
    const result = twin.simulate(action)
    expect(result.action_id).toBe('act-1')
    expect(result.cost_delta_usd).toBeLessThan(0) // savings
    // Original state unchanged
    const state = twin.getState()!
    expect(state.resources['res-1'].current_cost_usd_per_hour).toBe(1.0)
  })

  test('simulate TERMINATE removes resource from snapshot copy', () => {
    const twin = new DigitalTwin()
    twin.setState(makeSnapshot())
    const result = twin.simulate(makeAction({ action_type: 'TERMINATE' }))
    expect(result.predicted_outcome).toBe('TERMINATED')
    expect(result.snapshot_after.resources['res-1']).toBeUndefined()
    // Original state still has resource
    expect(twin.getState()!.resources['res-1']).toBeDefined()
  })

  test('simulate throws when no state loaded', () => {
    const twin = new DigitalTwin()
    expect(() => twin.simulate(makeAction())).toThrow()
  })

  test('updateState updates captured_at', () => {
    const twin = new DigitalTwin()
    twin.setState(makeSnapshot())
    const executedAt = new Date().toISOString()
    twin.updateState({ action_id: 'act-1', actual_savings_usd: 300, simulation_deviation_pct: 5, executed_at: executedAt, success: true })
    expect(twin.getState()!.captured_at).toBe(executedAt)
  })
})

// ─── RiskScorer ───────────────────────────────────────────────────────────────

describe('RiskScorer', () => {
  const scorer = new RiskScorer()

  function makeSimResult(overrides: Partial<{ blast_radius: number; reversibility: number; confidence: number; financial_impact: number }> = {}) {
    return {
      action_id: 'act-1',
      predicted_outcome: 'SCALED_DOWN',
      cost_delta_usd: -360,
      risk_indicators: {
        blast_radius: 1,
        reversibility: 0.8,
        confidence: 0.75,
        financial_impact: 360,
        ...overrides,
      },
      simulated_at: new Date().toISOString(),
      snapshot_after: makeSnapshot(),
    }
  }

  test('risk_score is in [0, 100]', () => {
    const result = scorer.score(makeAction(), makeSimResult())
    expect(result.risk_score).toBeGreaterThanOrEqual(0)
    expect(result.risk_score).toBeLessThanOrEqual(100)
  })

  test('confidence_threshold is in [0, 100]', () => {
    const result = scorer.score(makeAction(), makeSimResult())
    expect(result.confidence_threshold).toBeGreaterThanOrEqual(0)
    expect(result.confidence_threshold).toBeLessThanOrEqual(100)
  })

  test('high financial impact increases risk_score', () => {
    const low = scorer.score(makeAction(), makeSimResult({ financial_impact: 100 }))
    const high = scorer.score(makeAction(), makeSimResult({ financial_impact: 50000 }))
    expect(high.risk_score).toBeGreaterThan(low.risk_score)
  })

  test('low reversibility increases risk_score', () => {
    const reversible = scorer.score(makeAction(), makeSimResult({ reversibility: 1.0 }))
    const irreversible = scorer.score(makeAction(), makeSimResult({ reversibility: 0.0 }))
    expect(irreversible.risk_score).toBeGreaterThan(reversible.risk_score)
  })
})

// ─── ApprovalRouter ───────────────────────────────────────────────────────────

describe('ApprovalRouter', () => {
  const tenantConfig = { tenant_id: 'tenant-a', min_confidence: 60 }

  function makeRoutable(overrides: Partial<{ risk_score: number; confidence_threshold: number; projected_roi: number }> = {}) {
    return {
      action_id: 'act-1',
      action_type: 'SCALE_DOWN',
      resource_id: 'res-1',
      parameters: {},
      risk_score: 20,
      confidence_threshold: 80,
      projected_roi: 15,
      ...overrides,
    }
  }

  test('risk_score > 70 → REQUIRE_HUMAN_APPROVAL', async () => {
    const router = new ApprovalRouter(tenantConfig)
    const result = await router.route(makeRoutable({ risk_score: 75 }))
    expect(result.approval_state).toBe('REQUIRE_HUMAN_APPROVAL')
  })

  test('confidence_threshold < min_confidence → QUEUE_FOR_HUMAN_REVIEW', async () => {
    const router = new ApprovalRouter(tenantConfig)
    const result = await router.route(makeRoutable({ confidence_threshold: 50 }))
    expect(result.approval_state).toBe('QUEUE_FOR_HUMAN_REVIEW')
  })

  test('projected_roi < 0 → FLAG_FOR_HUMAN_REVIEW', async () => {
    const router = new ApprovalRouter(tenantConfig)
    const result = await router.route(makeRoutable({ projected_roi: -5 }))
    expect(result.approval_state).toBe('FLAG_FOR_HUMAN_REVIEW')
  })

  test('cached plan + risk_score < 30 → AUTO_EXECUTE_CACHED', async () => {
    const cache = new AgenticPlanCache()
    cache.store({ plan_id: 'p-1', action_type: 'SCALE_DOWN', resource_id: 'res-1', parameters: {}, risk_score: 20, simulation_results: {}, approval_records: [] })
    const router = new ApprovalRouter(tenantConfig, cache)
    const result = await router.route(makeRoutable({ risk_score: 20 }))
    expect(result.approval_state).toBe('AUTO_EXECUTE_CACHED')
  })

  test('default → AUTO_EXECUTE', async () => {
    const router = new ApprovalRouter(tenantConfig)
    const result = await router.route(makeRoutable())
    expect(result.approval_state).toBe('AUTO_EXECUTE')
  })
})

// ─── RollbackManager ─────────────────────────────────────────────────────────

describe('RollbackManager', () => {
  test('captureSnapshot stores resources', () => {
    const mgr = new RollbackManager()
    const snap = mgr.captureSnapshot('act-1', 'tenant-a', [{ resource_id: 'res-1', state: { cost: 1.0 }, captured_at: new Date().toISOString() }])
    expect(snap.action_id).toBe('act-1')
    expect(snap.resources).toHaveLength(1)
  })

  test('rollback emits RollbackEvent to ledger', async () => {
    const ledger: unknown[] = []
    const mgr = new RollbackManager({ writeLedger: async (e) => { ledger.push(e) } })
    mgr.captureSnapshot('act-1', 'tenant-a', [{ resource_id: 'res-1', state: {}, captured_at: new Date().toISOString() }])
    const result = await mgr.rollback('act-1')
    expect(result.success).toBe(true)
    expect(ledger).toHaveLength(1)
    expect((ledger[0] as any).action_type).toBe('ROLLBACK_INITIATED')
  })

  test('rollback throws when no snapshot found', async () => {
    const mgr = new RollbackManager()
    await expect(mgr.rollback('nonexistent')).rejects.toThrow()
  })

  test('rollback escalates to governor on failure', async () => {
    const escalated: string[] = []
    const mgr = new RollbackManager({
      restoreResource: async () => { throw new Error('restore failed') },
      escalateToGovernor: async (id) => { escalated.push(id) },
    })
    mgr.captureSnapshot('act-1', 'tenant-a', [{ resource_id: 'res-1', state: {}, captured_at: new Date().toISOString() }])
    const result = await mgr.rollback('act-1')
    expect(result.success).toBe(false)
    expect(escalated).toContain('act-1')
  })
})

// ─── AgenticPlanCache ─────────────────────────────────────────────────────────

describe('AgenticPlanCache', () => {
  test('stores and retrieves plan by hash', () => {
    const cache = new AgenticPlanCache()
    cache.store({ plan_id: 'p-1', action_type: 'SCALE_DOWN', resource_id: 'res-1', parameters: { scale_factor: 0.5 }, risk_score: 20, simulation_results: {}, approval_records: [] })
    const found = cache.lookup({ action_type: 'SCALE_DOWN', resource_id: 'res-1', parameters: { scale_factor: 0.5 } })
    expect(found).not.toBeNull()
    expect(found!.plan_id).toBe('p-1')
  })

  test('returns null for cache miss', () => {
    const cache = new AgenticPlanCache()
    const found = cache.lookup({ action_type: 'TERMINATE', resource_id: 'res-99', parameters: {} })
    expect(found).toBeNull()
  })

  test('invalidate removes all plans for resource', () => {
    const cache = new AgenticPlanCache()
    cache.store({ plan_id: 'p-1', action_type: 'SCALE_DOWN', resource_id: 'res-1', parameters: {}, risk_score: 20, simulation_results: {}, approval_records: [] })
    cache.store({ plan_id: 'p-2', action_type: 'TERMINATE', resource_id: 'res-1', parameters: {}, risk_score: 20, simulation_results: {}, approval_records: [] })
    const removed = cache.invalidate('res-1')
    expect(removed).toBe(2)
    expect(cache.size()).toBe(0)
  })
})

// ─── ROIEngine ────────────────────────────────────────────────────────────────

describe('ROIEngine', () => {
  const engine = new ROIEngine()

  test('calculate computes net_roi_pct correctly', () => {
    const result = engine.calculate({
      cost_savings_usd: 1000,
      execution_cost_usd: 100,
      reasoning_cost_usd: 50,
      avoided_loss_usd: 200,
      platform_cost_usd: 500,
    })
    // (1000 - 100 - 50 + 200) / 500 * 100 = 210%
    expect(result.net_roi_pct).toBeCloseTo(210)
    expect(result.formula_string).toContain('net_roi_pct')
  })

  test('throws when platform_cost_usd is zero', () => {
    expect(() => engine.calculate({ cost_savings_usd: 100, execution_cost_usd: 0, reasoning_cost_usd: 0, avoided_loss_usd: 0, platform_cost_usd: 0 })).toThrow()
  })

  test('costPerCorrectResult returns 0 when no correct sessions', () => {
    const e = new ROIEngine()
    expect(e.costPerCorrectResult('tenant-a')).toBe(0)
  })

  test('costPerCorrectResult = total_cost / correct_count', () => {
    const e = new ROIEngine()
    e.recordSession({ session_id: 's1', tenant_id: 'tenant-a', cost_usd: 10, correct: true, timestamp: new Date().toISOString() })
    e.recordSession({ session_id: 's2', tenant_id: 'tenant-a', cost_usd: 10, correct: false, timestamp: new Date().toISOString() })
    expect(e.costPerCorrectResult('tenant-a')).toBeCloseTo(20) // 20 total / 1 correct
  })

  test('compareOutcome flags >15% deviation as ReasoningErrorCandidate', () => {
    const action = { action_id: 'a1', action_type: 'SCALE_DOWN', projected_savings_usd: 1000, estimated_execution_cost_usd: 100, estimated_reasoning_cost_usd: 50, avoided_loss_usd: 0, platform_cost_usd: 500 }
    const projected = engine.projectROI(action)
    const deviation = engine.compareOutcome(action, projected.net_roi_pct * 0.5) // 50% of projected
    expect(deviation.is_reasoning_error_candidate).toBe(true)
  })
})

// ─── TransactionReconciler ────────────────────────────────────────────────────

describe('TransactionReconciler', () => {
  const reconciler = new TransactionReconciler()

  test('matches actions to billing records within 24h', () => {
    const actions = [{ action_id: 'a1', tenant_id: 'tenant-a', action_type: 'SCALE_DOWN', projected_cost_usd: 100, executed_at: new Date().toISOString() }]
    const billing = [{ record_id: 'r1', tenant_id: 'tenant-a', action_id: 'a1', actual_cost_usd: 100, billed_at: new Date().toISOString() }]
    const report = reconciler.reconcile(actions, billing, 'tenant-a')
    expect(report.matched).toBe(1)
    expect(report.discrepancies).toHaveLength(0)
  })

  test('flags discrepancy when actual_cost differs by >5%', () => {
    const actions = [{ action_id: 'a1', tenant_id: 'tenant-a', action_type: 'SCALE_DOWN', projected_cost_usd: 100, executed_at: new Date().toISOString() }]
    const billing = [{ record_id: 'r1', tenant_id: 'tenant-a', action_id: 'a1', actual_cost_usd: 110, billed_at: new Date().toISOString() }]
    const report = reconciler.reconcile(actions, billing, 'tenant-a')
    expect(report.discrepancies).toHaveLength(1)
    expect(report.discrepancies[0].flagged).toBe(true)
  })

  test('tracks unmatched actions', () => {
    const actions = [{ action_id: 'a1', tenant_id: 'tenant-a', action_type: 'SCALE_DOWN', projected_cost_usd: 100, executed_at: new Date().toISOString() }]
    const report = reconciler.reconcile(actions, [], 'tenant-a')
    expect(report.unmatched_action_ids).toContain('a1')
  })
})

// ─── VarianceAnalyzer ─────────────────────────────────────────────────────────

describe('VarianceAnalyzer', () => {
  const analyzer = new VarianceAnalyzer()

  test('attaches root_cause_attribution to each discrepancy', () => {
    const report = {
      tenant_id: 'tenant-a',
      period_from: new Date().toISOString(),
      period_to: new Date().toISOString(),
      total_actions: 1,
      matched: 1,
      discrepancies: [{ action_id: 'a1', projected_cost_usd: 100, actual_cost_usd: 110, variance_pct: 10, flagged: true }],
      unmatched_action_ids: [],
      generated_at: new Date().toISOString(),
    }
    const enriched = analyzer.analyze(report)
    expect(enriched.discrepancies[0].root_cause_attribution).toBeDefined()
    expect(enriched.discrepancies[0].root_cause_attribution.category).toBeTruthy()
  })

  test('root_cause_summary counts categories', () => {
    const report = {
      tenant_id: 'tenant-a',
      period_from: new Date().toISOString(),
      period_to: new Date().toISOString(),
      total_actions: 2,
      matched: 2,
      discrepancies: [
        { action_id: 'a1', projected_cost_usd: 100, actual_cost_usd: 160, variance_pct: 60, flagged: true },
        { action_id: 'a2', projected_cost_usd: 100, actual_cost_usd: 108, variance_pct: 8, flagged: true },
      ],
      unmatched_action_ids: [],
      generated_at: new Date().toISOString(),
    }
    const enriched = analyzer.analyze(report)
    const total = Object.values(enriched.root_cause_summary).reduce((a, b) => a + b, 0)
    expect(total).toBe(2)
  })
})

// ─── ReasoningRouter ─────────────────────────────────────────────────────────

describe('ReasoningRouter', () => {
  const router = new ReasoningRouter()

  test('routes to FAST for low composite and low financial impact', () => {
    const result = router.route({ task_id: 't1', tenant_id: 'tenant-a', risk_score: 0.1, financial_impact_usd: 500, tenant_config_factor: 0.1 })
    expect(result.tier).toBe('FAST')
  })

  test('routes to DEEP for high composite', () => {
    // composite = 0.9*0.4 + (40000/50000)*0.4 + 0.9*0.2 = 0.36 + 0.32 + 0.18 = 0.86 > 0.60
    const result = router.route({ task_id: 't1', tenant_id: 'tenant-a', risk_score: 0.9, financial_impact_usd: 40000, tenant_config_factor: 0.9 })
    expect(result.tier).toBe('DEEP')
  })

  test('routes to DEEP for financial_impact > $50k', () => {
    const result = router.route({ task_id: 't1', tenant_id: 'tenant-a', risk_score: 0.1, financial_impact_usd: 60000, tenant_config_factor: 0.1 })
    expect(result.tier).toBe('DEEP')
  })

  test('routes to MEDIUM for mid-range composite', () => {
    const result = router.route({ task_id: 't1', tenant_id: 'tenant-a', risk_score: 0.4, financial_impact_usd: 5000, tenant_config_factor: 0.3 })
    expect(result.tier).toBe('MEDIUM')
  })

  test('composite_signal is computed correctly', () => {
    const task = { task_id: 't1', tenant_id: 'tenant-a', risk_score: 0.5, financial_impact_usd: 25000, tenant_config_factor: 0.5 }
    const result = router.route(task)
    // composite = 0.5*0.4 + 0.5*0.4 + 0.5*0.2 = 0.5
    expect(result.composite_signal).toBeCloseTo(0.5)
  })
})

// ─── ModelProvider ────────────────────────────────────────────────────────────

describe('ModelProvider', () => {
  test('FastModelProvider returns result with model_id', async () => {
    const provider = new FastModelProvider()
    const result = await provider.infer('test prompt', {})
    expect(result.model_id).toBe('fast-model-v1')
    expect(result.output).toBeTruthy()
    expect(result.tokens_used).toBeGreaterThan(0)
  })

  test('ModelProviderRouter selects FAST provider for FAST tier', () => {
    const router = new ModelProviderRouter()
    const provider = router.selectProvider('FAST', 1.0)
    expect(provider.getLatencyProfile().max_ms).toBeLessThanOrEqual(500)
  })

  test('ModelProviderRouter selects DEEP provider for DEEP tier with budget', () => {
    const router = new ModelProviderRouter()
    const provider = router.selectProvider('DEEP', 1.0)
    expect(provider.getLatencyProfile().min_ms).toBeGreaterThanOrEqual(30_000)
  })
})

// ─── HallucinationDetector ────────────────────────────────────────────────────

describe('HallucinationDetector', () => {
  const detector = new HallucinationDetector()

  test('marks verified claims as VERIFIED', () => {
    const ds = [{ source_id: 'ds1', data: {}, verify: () => true }]
    const result = detector.validateClaims({ claims: [{ claim_id: 'c1', text: 'fact' }], confidence: 80 }, ds)
    expect(result.annotated_claims[0].status).toBe('VERIFIED')
    expect(result.adjusted_confidence).toBe(80)
  })

  test('marks unverifiable claims as UNVERIFIED and reduces confidence by 20', () => {
    const ds = [{ source_id: 'ds1', data: {}, verify: () => false }]
    const result = detector.validateClaims({ claims: [{ claim_id: 'c1', text: 'unverifiable' }], confidence: 80 }, ds)
    expect(result.annotated_claims[0].status).toBe('UNVERIFIED')
    expect(result.adjusted_confidence).toBe(60)
  })

  test('tracks hallucination rate per agent', () => {
    const d = new HallucinationDetector()
    const ds = [{ source_id: 'ds1', data: {}, verify: () => false }]
    d.validateClaims({ claims: [{ claim_id: 'c1', text: 'x' }, { claim_id: 'c2', text: 'y' }], confidence: 80, agent_id: 'agent-1' }, ds)
    const stats = d.getHallucinationRate('agent-1')
    expect(stats.structured_hallucination_rate_pct).toBe(100)
  })

  test('confidence never goes below 0', () => {
    const ds = [{ source_id: 'ds1', data: {}, verify: () => false }]
    const claims = Array.from({ length: 10 }, (_, i) => ({ claim_id: `c${i}`, text: 'x' }))
    const result = detector.validateClaims({ claims, confidence: 50 }, ds)
    expect(result.adjusted_confidence).toBeGreaterThanOrEqual(0)
  })
})

// ─── DualChainProcessor ───────────────────────────────────────────────────────

describe('DualChainProcessor', () => {
  test('returns MERGED when chains agree', () => {
    const processor = new DualChainProcessor()
    const chainA = { chain_id: 'A', conclusion: 'approve', reasoning_steps: [], confidence: 0.8, key_claims: [] }
    const chainB = { chain_id: 'B', conclusion: 'approve', reasoning_steps: [], confidence: 0.9, key_claims: [] }
    const result = processor.compareChains(chainA, chainB)
    expect(result.type).toBe('MERGED')
  })

  test('returns CONFLICT when chains contradict', () => {
    const processor = new DualChainProcessor()
    const chainA = { chain_id: 'A', conclusion: 'approve this action', reasoning_steps: [], confidence: 0.8, key_claims: [] }
    const chainB = { chain_id: 'B', conclusion: 'reject this action', reasoning_steps: [], confidence: 0.9, key_claims: [] }
    const result = processor.compareChains(chainA, chainB)
    expect(result.type).toBe('CONFLICT')
    if (result.type === 'CONFLICT') {
      expect(result.conflict.requires_human_review).toBe(true)
    }
  })

  test('process generates two chains and compares them', async () => {
    const processor = new DualChainProcessor()
    const result = await processor.process({ task_id: 't1', prompt: 'analyze cost', context: {} })
    expect(['MERGED', 'CONFLICT']).toContain(result.type)
  })
})

// ─── CostTracker ─────────────────────────────────────────────────────────────

describe('CostTracker', () => {
  test('costPerCorrectResult is never negative', () => {
    const tracker = new CostTracker()
    tracker.recordSession({ session_id: 's1', tenant_id: 'tenant-a', cost_usd: 5, correct: true, timestamp: new Date().toISOString() })
    expect(tracker.costPerCorrectResult('tenant-a')).toBeGreaterThanOrEqual(0)
  })

  test('costPerCorrectResult = total_cost / correct_sessions', () => {
    const tracker = new CostTracker()
    tracker.recordSession({ session_id: 's1', tenant_id: 'tenant-a', cost_usd: 10, correct: true, timestamp: new Date().toISOString() })
    tracker.recordSession({ session_id: 's2', tenant_id: 'tenant-a', cost_usd: 10, correct: true, timestamp: new Date().toISOString() })
    expect(tracker.costPerCorrectResult('tenant-a')).toBeCloseTo(10) // 20 / 2
  })

  test('returns partial result with budget_exhausted=true when budget exceeded', async () => {
    const tracker = new CostTracker()
    tracker.recordSession({ session_id: 's1', tenant_id: 'tenant-a', cost_usd: 100, correct: true, timestamp: new Date().toISOString() })
    const result = await tracker.runWithBudget('tenant-a', { max_reasoning_budget_usd: 50 }, async () => ({ result: 'done', cost_usd: 10 }))
    expect(result.budget_exhausted).toBe(true)
    expect(result.result).toBeNull()
  })

  test('getSummary returns correct totals', () => {
    const tracker = new CostTracker()
    tracker.recordSession({ session_id: 's1', tenant_id: 'tenant-a', cost_usd: 5, correct: true, timestamp: new Date().toISOString() })
    tracker.recordSession({ session_id: 's2', tenant_id: 'tenant-a', cost_usd: 5, correct: false, timestamp: new Date().toISOString() })
    const summary = tracker.getSummary('tenant-a')
    expect(summary.total_cost_usd).toBe(10)
    expect(summary.correct_sessions).toBe(1)
    expect(summary.total_sessions).toBe(2)
  })
})

// ─── CarbonAwareScheduler ─────────────────────────────────────────────────────

describe('CarbonAwareScheduler', () => {
  const scheduler = new CarbonAwareScheduler()

  function makeWorkload(overrides: Partial<{ time_shiftable: boolean; deadline: string }> = {}) {
    return {
      workload_id: 'w1',
      tenant_id: 'tenant-a',
      energy_kwh: 10,
      time_shiftable: true,
      deadline: new Date(Date.now() + 3600000).toISOString(),
      region: 'us-east-1',
      current_window: { region: 'us-east-1', start_time: new Date().toISOString(), end_time: new Date(Date.now() + 3600000).toISOString(), intensity_gco2_per_kwh: 400 },
      ...overrides,
    }
  }

  test('EXECUTE_NOW when not time_shiftable', () => {
    const result = scheduler.schedule(makeWorkload({ time_shiftable: false }), [])
    expect(result.decision).toBe('EXECUTE_NOW')
  })

  test('SCHEDULE when lower-intensity window available', () => {
    const windows = [{ region: 'us-east-1', start_time: new Date(Date.now() + 1800000).toISOString(), end_time: new Date(Date.now() + 5400000).toISOString(), intensity_gco2_per_kwh: 200 }]
    const result = scheduler.schedule(makeWorkload(), windows)
    expect(result.decision).toBe('SCHEDULE')
  })

  test('EXECUTE_NOW when no lower-intensity windows found', () => {
    const windows = [{ region: 'us-east-1', start_time: new Date(Date.now() + 1800000).toISOString(), end_time: new Date(Date.now() + 5400000).toISOString(), intensity_gco2_per_kwh: 390 }]
    const result = scheduler.schedule(makeWorkload(), windows)
    expect(result.decision).toBe('EXECUTE_NOW')
  })
})

describe('CO2eSavingsCalculator', () => {
  test('carbon_savings_kgco2e is always >= 0', () => {
    const workload = { workload_id: 'w1', tenant_id: 'tenant-a', energy_kwh: 10, time_shiftable: true, deadline: new Date().toISOString(), region: 'us-east-1', current_window: { region: 'us-east-1', start_time: '', end_time: '', intensity_gco2_per_kwh: 200 } }
    const original = { region: 'us-east-1', start_time: '', end_time: '', intensity_gco2_per_kwh: 200 }
    const scheduled = { region: 'us-east-1', start_time: '', end_time: '', intensity_gco2_per_kwh: 400 } // worse window
    const result = CO2eSavingsCalculator.calculate(workload, original, scheduled)
    expect(result.carbon_savings_kgco2e).toBeGreaterThanOrEqual(0)
  })

  test('calculates correct savings', () => {
    const workload = { workload_id: 'w1', tenant_id: 'tenant-a', energy_kwh: 10, time_shiftable: true, deadline: new Date().toISOString(), region: 'us-east-1', current_window: { region: 'us-east-1', start_time: '', end_time: '', intensity_gco2_per_kwh: 400 } }
    const original = { region: 'us-east-1', start_time: '', end_time: '', intensity_gco2_per_kwh: 400 }
    const scheduled = { region: 'us-east-1', start_time: '', end_time: '', intensity_gco2_per_kwh: 200 }
    const result = CO2eSavingsCalculator.calculate(workload, original, scheduled)
    // 10 * (400 - 200) / 1000 = 2 kgCO2e
    expect(result.carbon_savings_kgco2e).toBeCloseTo(2)
  })
})

// ─── LiquidLedger ─────────────────────────────────────────────────────────────

describe('LiquidLedger', () => {
  function makeEntry(overrides: Partial<{ entry_id: string; action_type: string }> = {}) {
    return {
      entry_id: `e-${Math.random()}`,
      tenant_id: 'tenant-a',
      agent_id: 'AUDITOR',
      action_type: 'ANOMALY_DETECTED',
      payload: { detail: 'test' },
      timestamp: new Date().toISOString(),
      ...overrides,
    }
  }

  test('append stores entry with sequence_number and hash', () => {
    const ledger = new LiquidLedger()
    const stored = ledger.append(makeEntry())
    expect(stored.sequence_number).toBe(1)
    expect(stored.hash).toBeTruthy()
    expect(stored.prev_hash).toBeTruthy()
  })

  test('sequence_number increments per tenant', () => {
    const ledger = new LiquidLedger()
    const e1 = ledger.append(makeEntry())
    const e2 = ledger.append(makeEntry())
    expect(e2.sequence_number).toBe(e1.sequence_number + 1)
  })

  test('verifyIntegrity returns valid for untampered entries', () => {
    const ledger = new LiquidLedger()
    ledger.append(makeEntry())
    ledger.append(makeEntry())
    const result = ledger.verifyIntegrity('tenant-a', 1, 2)
    expect(result.valid).toBe(true)
    expect(result.checked_count).toBe(2)
  })

  test('verifyIntegrity detects tampered entry', () => {
    const ledger = new LiquidLedger()
    ledger.append(makeEntry())
    const stored = ledger.getAll('tenant-a')
    // Tamper with the hash
    ;(stored[0] as any).hash = 'tampered'
    const result = ledger.verifyIntegrity('tenant-a', 1, 1)
    expect(result.valid).toBe(false)
  })

  test('query filters by action_type', () => {
    const ledger = new LiquidLedger()
    ledger.append(makeEntry({ action_type: 'ANOMALY_DETECTED' }))
    ledger.append(makeEntry({ action_type: 'ROLLBACK_INITIATED' }))
    const results = ledger.query('tenant-a', { action_type: 'ANOMALY_DETECTED' })
    expect(results).toHaveLength(1)
  })

  test('exportRange throws for range > 30 days', () => {
    const ledger = new LiquidLedger()
    const from = new Date(Date.now() - 31 * 86400000).toISOString()
    const to = new Date().toISOString()
    expect(() => ledger.exportRange('tenant-a', from, to)).toThrow(/30 days/)
  })

  test('exportRange returns entries within range', () => {
    const ledger = new LiquidLedger()
    ledger.append(makeEntry())
    const from = new Date(Date.now() - 86400000).toISOString()
    const to = new Date(Date.now() + 86400000).toISOString()
    const results = ledger.exportRange('tenant-a', from, to)
    expect(results).toHaveLength(1)
  })
})

// ─── RBACMiddleware ───────────────────────────────────────────────────────────

describe('RBACMiddleware', () => {
  test('READ_ONLY_ANALYST can read metrics', () => {
    const rbac = new RBACMiddleware()
    const result = rbac.check({ user_id: 'u1', tenant_id: 'tenant-a', role: 'READ_ONLY_ANALYST' }, 'read:metrics')
    expect(result.allowed).toBe(true)
  })

  test('READ_ONLY_ANALYST cannot execute actions', () => {
    const rbac = new RBACMiddleware()
    const result = rbac.check({ user_id: 'u1', tenant_id: 'tenant-a', role: 'READ_ONLY_ANALYST' }, 'execute:actions')
    expect(result.allowed).toBe(false)
  })

  test('PLATFORM_ADMINISTRATOR has all permissions', () => {
    const rbac = new RBACMiddleware()
    const permissions = rbac.getPermissions('PLATFORM_ADMINISTRATOR')
    expect(permissions).toContain('activate:kill_switch')
    expect(permissions).toContain('manage:tenants')
    expect(permissions).toContain('write:all')
  })

  test('enforce throws on denied access', () => {
    const rbac = new RBACMiddleware()
    expect(() => rbac.enforce({ user_id: 'u1', tenant_id: 'tenant-a', role: 'READ_ONLY_ANALYST' }, 'execute:actions')).toThrow(/Access denied/)
  })

  test('logs UnauthorizedAttemptEvent to ledger on denied access', () => {
    const ledger = new LiquidLedger()
    const rbac = new RBACMiddleware(ledger)
    rbac.check({ user_id: 'u1', tenant_id: 'tenant-a', role: 'READ_ONLY_ANALYST' }, 'execute:actions')
    const entries = ledger.query('tenant-a', { action_type: 'UNAUTHORIZED_ATTEMPT' })
    expect(entries).toHaveLength(1)
  })

  test('FINANCE_ADMINISTRATOR can read and write billing', () => {
    const rbac = new RBACMiddleware()
    expect(rbac.check({ user_id: 'u1', tenant_id: 'tenant-a', role: 'FINANCE_ADMINISTRATOR' }, 'read:billing').allowed).toBe(true)
    expect(rbac.check({ user_id: 'u1', tenant_id: 'tenant-a', role: 'FINANCE_ADMINISTRATOR' }, 'write:billing').allowed).toBe(true)
  })
})

// ─── APIKeyManager ────────────────────────────────────────────────────────────

describe('APIKeyManager', () => {
  test('generate returns a key and metadata', () => {
    const mgr = new APIKeyManager()
    const { key, metadata } = mgr.generate('tenant-a', 'OPERATOR')
    expect(key).toBeTruthy()
    expect(metadata.tenant_id).toBe('tenant-a')
    expect(metadata.role).toBe('OPERATOR')
    expect(metadata.key_id).toBeTruthy()
  })

  test('validate returns valid=true for correct key', () => {
    const mgr = new APIKeyManager()
    const { key } = mgr.generate('tenant-a', 'OPERATOR')
    const result = mgr.validate(key)
    expect(result.valid).toBe(true)
    expect(result.tenant_id).toBe('tenant-a')
    expect(result.role).toBe('OPERATOR')
  })

  test('validate returns valid=false for wrong key', () => {
    const mgr = new APIKeyManager()
    mgr.generate('tenant-a', 'OPERATOR')
    const result = mgr.validate('bad-key-id.wrongsecret')
    expect(result.valid).toBe(false)
  })

  test('validate returns valid=false for tampered key', () => {
    const mgr = new APIKeyManager()
    const { key } = mgr.generate('tenant-a', 'OPERATOR')
    const tampered = key.slice(0, -4) + 'xxxx'
    const result = mgr.validate(tampered)
    expect(result.valid).toBe(false)
  })

  test('logUsage writes to ledger', () => {
    const ledger = new LiquidLedger()
    const mgr = new APIKeyManager(ledger)
    const { metadata } = mgr.generate('tenant-a', 'OPERATOR')
    mgr.logUsage(metadata.key_id, '127.0.0.1', 'GET /api/metrics')
    const entries = ledger.query('tenant-a', { action_type: 'API_KEY_USAGE' })
    expect(entries).toHaveLength(1)
  })

  test('revoke removes key', () => {
    const mgr = new APIKeyManager()
    const { key, metadata } = mgr.generate('tenant-a', 'OPERATOR')
    mgr.revoke(metadata.key_id)
    const result = mgr.validate(key)
    expect(result.valid).toBe(false)
  })
})
