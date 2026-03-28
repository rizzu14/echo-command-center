import { useState } from 'react';
import Editor from '@monaco-editor/react';

const DEFAULT_POLICY = `# ECHO Governance Policy
# Version: 2.1.0

governance:
  kill_switch:
    enabled: true
    require_confirmation: true
    confirmation_phrase: "CONFIRM"

  dow_limits:
    daily_spend_usd: 50000
    alert_threshold_pct: 80
    auto_halt_at_pct: 100

  action_approval:
    risk_threshold_auto_approve: 30
    risk_threshold_require_human: 70
    risk_threshold_block: 90

  reasoning_tiers:
    fast:
      max_financial_impact_usd: 1000
      latency_target_ms: 500
    medium:
      max_financial_impact_usd: 10000
      latency_target_ms: 15000
    deep:
      min_financial_impact_usd: 10000
      dual_chain_required: true
      contradiction_detection: true

  compliance:
    audit_retention_years: 7
    tamper_proof_ledger: true
    tenant_isolation: strict

  agents:
    auditor:
      confidence_threshold: 0.85
      hallucination_rate_max: 0.05
    governor:
      confidence_threshold: 0.90
      veto_power: true
    green_architect:
      confidence_threshold: 0.80
      carbon_weight: 0.3
    finance:
      confidence_threshold: 0.88
      roi_model: npv_weighted
`;

export function PolicyEditor() {
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    // Basic YAML validation
    if (!policy.includes('governance:')) {
      setError('Invalid policy: missing governance root key');
      return;
    }
    setError(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPolicy(DEFAULT_POLICY);
    setError(null);
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div className="section-header">
        <div>
          <div className="section-title">Policy Editor</div>
          <div className="section-subtitle">YAML governance configuration</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>Reset</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            style={{ background: saved ? 'var(--color-accent-green)' : undefined }}
          >
            {saved ? '✓ Saved' : 'Save Policy'}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 'var(--space-3)',
            background: 'var(--color-accent-red-subtle)',
            border: '1px solid var(--color-accent-red)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-accent-red)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      <div
        style={{
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}
      >
        <Editor
          height="400px"
          language="yaml"
          value={policy}
          onChange={(v) => setPolicy(v ?? '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: 'SF Mono, Fira Code, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            padding: { top: 12, bottom: 12 },
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}
