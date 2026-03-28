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
          <div className="section-subtitle">YAML governance configuration · live validation</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {saved && (
            <span style={{
              fontSize: 11,
              color: 'var(--color-accent-green)',
              fontWeight: 700,
              padding: '3px 10px',
              background: 'rgba(52,208,88,0.1)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(52,208,88,0.3)',
              animation: 'fadeIn 0.2s ease',
            }}>
              ✓ Saved
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>Reset</button>
          <button
            className="btn btn-sm"
            onClick={handleSave}
            style={{
              background: saved
                ? 'linear-gradient(135deg, var(--color-accent-green), #28a745)'
                : undefined,
              boxShadow: saved ? '0 1px 8px rgba(52,208,88,0.3)' : undefined,
            }}
          >
            {saved ? '✓ Applied' : 'Save Policy'}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'rgba(240,72,62,0.06)',
            border: '1px solid rgba(240,72,62,0.35)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-accent-red)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderLeft: '3px solid var(--color-accent-red)',
          }}
        >
          <span style={{ fontSize: 14 }}>⚠</span>
          {error}
        </div>
      )}

      <div
        style={{
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm), inset 0 0 0 1px rgba(255,255,255,0.02)',
        }}
      >
        {/* Editor header bar */}
        <div style={{
          padding: '8px 16px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#f0483e', '#f0b429', '#34d058'].map((c) => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
            ))}
          </div>
          <span style={{
            fontSize: 10,
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            fontWeight: 600,
          }}>
            echo-governance-policy.yaml
          </span>
        </div>

        <Editor
          height="400px"
          language="yaml"
          value={policy}
          onChange={(v) => setPolicy(v ?? '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: 'SF Mono, Fira Code, Cascadia Code, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            padding: { top: 16, bottom: 16 },
            wordWrap: 'on',
            lineHeight: 22,
            letterSpacing: 0.3,
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
          }}
        />
      </div>
    </div>
  );
}
