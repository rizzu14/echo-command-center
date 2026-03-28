/**
 * ECHO Engine — self-contained backend engine using inline implementations.
 * All core logic is implemented here to avoid cross-package import issues.
 */

import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

// ── Liquid Ledger ─────────────────────────────────────────────────────────────

interface LedgerEntry {
  entry_id: string;
  tenant_id: string;
  agent_id: string;
  action_type: string;
  resource_id?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface StoredEntry extends LedgerEntry {
  sequence_number: number;
  hash: string;
  prev_hash: string;
}

class LiquidLedger {
  private entries = new Map<string, StoredEntry[]>();
  private sequences = new Map<string, number>();

  private getOrCreate(tenantId: string): StoredEntry[] {
    if (!this.entries.has(tenantId)) this.entries.set(tenantId, []);
    return this.entries.get(tenantId)!;
  }

  append(entry: LedgerEntry): StoredEntry {
    const tenantEntries = this.getOrCreate(entry.tenant_id);
    const seq = (this.sequences.get(entry.tenant_id) ?? 0) + 1;
    this.sequences.set(entry.tenant_id, seq);
    const prev_hash = tenantEntries.length > 0
      ? tenantEntries[tenantEntries.length - 1].hash
      : '0'.repeat(64);
    const hashInput = JSON.stringify({ ...entry, sequence_number: seq, prev_hash });
    const hash = createHash('sha256').update(hashInput).digest('hex');
    const stored: StoredEntry = { ...entry, sequence_number: seq, hash, prev_hash };
    tenantEntries.push(stored);
    return stored;
  }

  verifyIntegrity(tenantId: string, fromSeq: number, toSeq: number) {
    const range = this.getOrCreate(tenantId).filter(e => e.sequence_number >= fromSeq && e.sequence_number <= toSeq);
    for (let i = 0; i < range.length; i++) {
      const entry = range[i];
      const prev_hash = i === 0 ? entry.prev_hash : range[i - 1].hash;
      const expected = createHash('sha256').update(JSON.stringify({ ...entry, prev_hash })).digest('hex');
      if (expected !== entry.hash) return { valid: false, first_tampered_entry: entry, checked_count: i + 1 };
    }
    return { valid: true, checked_count: range.length };
  }

  query(tenantId: string, filters: { action_type?: string; agent_id?: string; resource_id?: string } = {}) {
    return this.getOrCreate(tenantId).filter(e => {
      if (filters.action_type && e.action_type !== filters.action_type) return false;
      if (filters.agent_id && e.agent_id !== filters.agent_id) return false;
      if (filters.resource_id && e.resource_id !== filters.resource_id) return false;
      return true;
    });
  }

  getAll(tenantId: string): StoredEntry[] { return [...this.getOrCreate(tenantId)]; }
}

// ── Kill Switch ───────────────────────────────────────────────────────────────

class KillSwitch {
  private states = new Map<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>();
  private activations = new Map<string, { activated_by: string; activated_at: string }>();

  getState(tenantId: string) { return this.states.get(tenantId) ?? 'CLOSED'; }
  isExecutionAllowed(tenantId: string) { return this.getState(tenantId) !== 'OPEN'; }

  async activate(tenantId: string, userId: string, ledger: LiquidLedger) {
    this.states.set(tenantId, 'OPEN');
    this.activations.set(tenantId, { activated_by: userId, activated_at: new Date().toISOString() });
    ledger.append({
      entry_id: `ks-${Date.now()}`,
      tenant_id: tenantId,
      agent_id: 'governor-agent',
      action_type: 'KILL_SWITCH_ACTIVATED',
      payload: { user_identity: userId, timestamp: new Date().toISOString(), event_type: 'KILL_SWITCH_ACTIVATED' },
      timestamp: new Date().toISOString(),
    });
  }

  deactivate(tenantId: string) { this.states.set(tenantId, 'HALF_OPEN'); }
  close(tenantId: string) { this.states.set(tenantId, 'CLOSED'); }
  getActivation(tenantId: string) { return this.activations.get(tenantId); }
}

// ── DoW Accumulator ───────────────────────────────────────────────────────────

class DoWAccumulator {
  private buckets = new Map<string, number>();

  private hourBucket(date = new Date()) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCHours()).padStart(2, '0')}`;
  }

  add(tenantId: string, amountUsd: number, limitUsd: number) {
    const key = `${tenantId}:${this.hourBucket()}`;
    this.buckets.set(key, (this.buckets.get(key) ?? 0) + amountUsd);
    const rolling = this.rollingSum(tenantId);
    return { rollingSum: rolling, limitExceeded: rolling > limitUsd };
  }

  rollingSum(tenantId: string) {
    const now = new Date();
    let total = 0;
    for (let i = 0; i < 24; i++) {
      const t = new Date(now.getTime() - i * 3600000);
      total += this.buckets.get(`${tenantId}:${this.hourBucket(t)}`) ?? 0;
    }
    return total;
  }

  reset(tenantId: string) {
    for (const key of this.buckets.keys()) {
      if (key.startsWith(`${tenantId}:`)) this.buckets.delete(key);
    }
  }
}

// ── Anomaly Detector ──────────────────────────────────────────────────────────

class AnomalyDetector {
  private windows = new Map<string, { costs: number[]; timestamps: string[] }>();

  seedHistory(tenantId: string, resourceType: string, history: { cost: number; timestamp: string }[]) {
    const key = `${tenantId}:${resourceType}`;
    if (!this.windows.has(key)) this.windows.set(key, { costs: [], timestamps: [] });
    const w = this.windows.get(key)!;
    history.forEach(h => { w.costs.push(h.cost); w.timestamps.push(h.timestamp); });
  }

  async detect(tenantId: string, resourceId: string, resourceType: string, hourlyCostUsd: number) {
    const key = `${tenantId}:${resourceType}`;
    if (!this.windows.has(key)) this.windows.set(key, { costs: [], timestamps: [] });
    const w = this.windows.get(key)!;

    const mean = w.costs.length > 0 ? w.costs.reduce((a, b) => a + b, 0) / w.costs.length : 0;
    const variance = w.costs.length > 0 ? w.costs.reduce((s, v) => s + (v - mean) ** 2, 0) / w.costs.length : 0;
    const std_dev = Math.sqrt(variance);
    const z_score = std_dev > 0 ? (hourlyCostUsd - mean) / std_dev : 0;

    w.costs.push(hourlyCostUsd);
    w.timestamps.push(new Date().toISOString());
    if (w.costs.length > 168) { w.costs.shift(); w.timestamps.shift(); } // 7 days

    const triggered = z_score > 2.5;
    if (!triggered) return { triggered: false, z_score, mean, std_dev };

    const category = hourlyCostUsd > mean * 2 ? 'USAGE_SPIKE'
      : hourlyCostUsd < 0.01 ? 'IDLE'
      : z_score > 4 ? 'USAGE_SPIKE' : 'OVER_PROVISIONED';

    const savings = (hourlyCostUsd - hourlyCostUsd * 0.5) * 720;
    return {
      triggered: true,
      z_score,
      mean,
      std_dev,
      event: {
        event_id: `evt-${Date.now()}`,
        tenant_id: tenantId,
        resource_id: resourceId,
        anomaly_category: category,
        hourly_cost_usd: hourlyCostUsd,
        detection_ts: new Date().toISOString(),
        emission_ts: new Date().toISOString(),
        threshold_config: { z_score_threshold: 2.5, mean, std_dev, z_score },
      },
      playbook: {
        playbook_id: `pb-${Date.now()}`,
        tenant_id: tenantId,
        anomaly_ref: `evt-${Date.now()}`,
        recommended_actions: [{ action_type: 'OPTIMIZE', target_resource: resourceId, parameters: {}, cost_impact_formula: `savings = ${hourlyCostUsd} * 0.5 * 720`, estimated_savings_usd: savings }],
        cost_impact_math: {
          current_hourly_cost: hourlyCostUsd,
          optimized_hourly_cost: hourlyCostUsd * 0.5,
          hours_per_month: 720,
          projected_monthly_savings_usd: savings,
          formula_string: `savings = (${hourlyCostUsd} - ${hourlyCostUsd * 0.5}) * 720 = ${savings.toFixed(2)}`,
        },
        estimated_savings_usd: savings,
        confidence_score: 0.85,
        created_at: new Date().toISOString(),
      },
    };
  }
}

// ── ROI Engine ────────────────────────────────────────────────────────────────

class ROIEngine {
  private sessions: { session_id: string; tenant_id: string; cost_usd: number; correct: boolean; timestamp: string }[] = [];

  calculate(input: { cost_savings_usd: number; execution_cost_usd: number; reasoning_cost_usd: number; avoided_loss_usd: number; platform_cost_usd: number }) {
    if (input.platform_cost_usd === 0) throw new Error('platform_cost_usd must be non-zero');
    const net_roi_pct = ((input.cost_savings_usd - input.execution_cost_usd - input.reasoning_cost_usd + input.avoided_loss_usd) / input.platform_cost_usd) * 100;
    return { ...input, net_roi_pct, formula_string: `net_roi_pct = (${input.cost_savings_usd} - ${input.execution_cost_usd} - ${input.reasoning_cost_usd} + ${input.avoided_loss_usd}) / ${input.platform_cost_usd} * 100 = ${net_roi_pct.toFixed(2)}%` };
  }

  recordSession(s: typeof this.sessions[0]) { this.sessions.push(s); }

  costPerCorrectResult(tenantId: string) {
    const filtered = this.sessions.filter(s => s.tenant_id === tenantId);
    const correct = filtered.filter(s => s.correct);
    if (correct.length === 0) return 0;
    return Math.max(0, filtered.reduce((sum, s) => sum + s.cost_usd, 0) / correct.length);
  }
}

// ── Reasoning Router ──────────────────────────────────────────────────────────

class ReasoningRouter {
  route(riskScore: number, financialImpact: number, tenantFactor = 0.5) {
    const normalized = Math.min(1, financialImpact / 50000);
    const composite = riskScore * 0.4 + normalized * 0.4 + tenantFactor * 0.2;
    const tier = financialImpact > 50000 || composite > 0.60 ? 'DEEP'
      : composite >= 0.30 || (financialImpact >= 1000 && financialImpact <= 50000) ? 'MEDIUM'
      : 'FAST';
    const latency = tier === 'FAST' ? Math.floor(Math.random() * 400 + 50)
      : tier === 'MEDIUM' ? Math.floor(Math.random() * 10000 + 5000)
      : Math.floor(Math.random() * 90000 + 30000);
    const model = tier === 'FAST' ? 'gpt-4o-fast' : tier === 'MEDIUM' ? 'claude-3.5-sonnet' : 'o3-deep';
    return { tier, composite_signal: composite, latency_ms: latency, model_id: model };
  }
}

// ── RBAC ──────────────────────────────────────────────────────────────────────

type Role = 'READ_ONLY_ANALYST' | 'OPERATOR' | 'FINANCE_ADMINISTRATOR' | 'PLATFORM_ADMINISTRATOR';
const PERMISSIONS: Record<Role, string[]> = {
  READ_ONLY_ANALYST: ['read:metrics', 'read:reports', 'read:ledger'],
  OPERATOR: ['read:metrics', 'read:reports', 'read:ledger', 'write:actions', 'execute:actions'],
  FINANCE_ADMINISTRATOR: ['read:metrics', 'read:reports', 'read:ledger', 'read:billing', 'write:billing'],
  PLATFORM_ADMINISTRATOR: ['read:metrics', 'read:reports', 'read:ledger', 'write:actions', 'execute:actions', 'read:billing', 'write:billing', 'manage:tenants', 'activate:kill_switch', 'read:all', 'write:all'],
};

class RBACMiddleware {
  constructor(private ledger: LiquidLedger) {}
  check(userId: string, tenantId: string, role: Role, permission: string) {
    const allowed = PERMISSIONS[role]?.includes(permission) ?? false;
    if (!allowed) {
      this.ledger.append({ entry_id: `unauth-${Date.now()}`, tenant_id: tenantId, agent_id: 'RBAC', action_type: 'UNAUTHORIZED_ATTEMPT', payload: { user_id: userId, role, attempted_permission: permission }, timestamp: new Date().toISOString() });
    }
    return { allowed, reason: allowed ? undefined : `Role ${role} lacks permission: ${permission}` };
  }
  getPermissions(role: Role) { return PERMISSIONS[role] ?? []; }
}

// ── API Key Manager ───────────────────────────────────────────────────────────

class APIKeyManager {
  private keys = new Map<string, { hash: string; salt: string; tenant_id: string; role: Role; created_at: string }>();

  constructor(private ledger: LiquidLedger) {}

  generate(tenantId: string, role: Role) {
    const rawKey = randomBytes(32).toString('hex');
    const key_id = `key-${randomBytes(8).toString('hex')}`;
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(rawKey, salt, 100000, 64, 'sha512').toString('hex');
    this.keys.set(key_id, { hash, salt, tenant_id: tenantId, role, created_at: new Date().toISOString() });
    return { key: `${key_id}.${rawKey}`, metadata: { key_id, tenant_id: tenantId, role, created_at: new Date().toISOString() } };
  }

  validate(key: string) {
    const dot = key.indexOf('.');
    if (dot === -1) return { valid: false };
    const key_id = key.slice(0, dot);
    const rawKey = key.slice(dot + 1);
    const stored = this.keys.get(key_id);
    if (!stored) return { valid: false };
    const hash = pbkdf2Sync(rawKey, stored.salt, 100000, 64, 'sha512').toString('hex');
    if (hash !== stored.hash) return { valid: false };
    return { valid: true, tenant_id: stored.tenant_id, role: stored.role, key_id };
  }

  logUsage(keyId: string, callingIp: string, operation: string) {
    const stored = this.keys.get(keyId);
    if (!stored) return;
    this.ledger.append({ entry_id: `api-${Date.now()}`, tenant_id: stored.tenant_id, agent_id: 'API_KEY_MANAGER', action_type: 'API_KEY_USAGE', payload: { key_id: keyId, calling_ip: callingIp, operation }, timestamp: new Date().toISOString() });
  }
}

// ── Contract Digital Twin ─────────────────────────────────────────────────────

class ContractDigitalTwin {
  private models = new Map<string, { contract: Record<string, unknown>; state: string; last_evaluated: string }>();

  ingestContract(contractJson: unknown) {
    const c = contractJson as Record<string, unknown>;
    if (!c.contract_id || !c.tenant_id || !c.vendor_name) throw new Error('Missing required fields: contract_id, tenant_id, vendor_name');
    const model = { contract: c, state: 'HEALTHY', last_evaluated: new Date().toISOString() };
    this.models.set(c.contract_id as string, model);
    return model;
  }

  getAllModels() { return Array.from(this.models.values()); }
  getModel(id: string) { return this.models.get(id); }
}

// ── Engine Singleton ──────────────────────────────────────────────────────────

export const ledger = new LiquidLedger();
export const killSwitch = new KillSwitch();
export const dowAccumulator = new DoWAccumulator();
export const anomalyDetector = new AnomalyDetector();
export const roiEngine = new ROIEngine();
export const reasoningRouter = new ReasoningRouter();
export const rbac = new RBACMiddleware(ledger);
export const apiKeyManager = new APIKeyManager(ledger);
export const contractTwin = new ContractDigitalTwin();

export function getEngineStatus(tenantId: string) {
  return {
    ledger_entries: ledger.getAll(tenantId).length,
    kill_switch_active: !killSwitch.isExecutionAllowed(tenantId),
    kill_switch_state: killSwitch.getState(tenantId),
    dow_rolling_sum: dowAccumulator.rollingSum(tenantId),
    roi_cost_per_correct: roiEngine.costPerCorrectResult(tenantId),
    engine: 'loaded',
  };
}

export async function runAnomalyDetection(tenantId: string, resourceId: string, hourlyCostUsd: number) {
  const result = await anomalyDetector.detect(tenantId, resourceId, 'EC2_INSTANCE', hourlyCostUsd);
  if (result.triggered && result.event) {
    ledger.append({
      entry_id: `anomaly-${Date.now()}`,
      tenant_id: tenantId,
      agent_id: 'auditor-agent',
      action_type: 'ANOMALY_DETECTED',
      resource_id: resourceId,
      payload: { event: result.event, playbook: result.playbook },
      timestamp: new Date().toISOString(),
    });
  }
  return result;
}

export async function routeReasoning(tenantId: string, riskScore: number, financialImpact: number) {
  const result = reasoningRouter.route(riskScore / 100, financialImpact);
  const costPerToken = result.tier === 'FAST' ? 0.000001 : result.tier === 'MEDIUM' ? 0.00001 : 0.0001;
  const tokens = Math.floor(Math.random() * 500 + 100);
  roiEngine.recordSession({
    session_id: `session-${Date.now()}`,
    tenant_id: tenantId,
    cost_usd: tokens * costPerToken,
    correct: true,
    timestamp: new Date().toISOString(),
  });
  return { ...result, tokens_used: tokens, cost_usd: tokens * costPerToken };
}
