import { useState } from 'react';
import { useEchoStore } from '../../store';

function timeAgo(ts: string | null): string {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function DoWConfig() {
  const dowConfig = useEchoStore((s) => s.dowConfig);
  const [editLimit, setEditLimit] = useState(false);
  const [limitValue, setLimitValue] = useState(dowConfig?.dailySpendLimitUsd.toString() ?? '50000');

  if (!dowConfig) return null;

  const spendPct = (dowConfig.currentRollingSpendUsd / dowConfig.dailySpendLimitUsd) * 100;
  const isWarning = spendPct >= dowConfig.alertThresholdPct;
  const isDanger = spendPct >= 95;

  const barColor = isDanger
    ? 'var(--color-accent-red)'
    : isWarning
    ? 'var(--color-accent-yellow)'
    : 'var(--color-accent-green)';

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="section-title">Deed of Work (DoW) Limits</div>
          <div className="section-subtitle">Daily spend guardrails and rolling budget</div>
        </div>
        {isWarning && (
          <span
            style={{
              fontSize: 10,
              color: isDanger ? 'var(--color-accent-red)' : 'var(--color-accent-yellow)',
              fontWeight: 700,
              background: isDanger ? 'var(--color-accent-red-subtle)' : 'var(--color-accent-yellow-subtle)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              animation: isDanger ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}
          >
            {isDanger ? '⚠ NEAR LIMIT' : '⚠ WARNING'}
          </span>
        )}
      </div>

      {/* Spend limit input */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            24h Spend Limit (USD)
          </label>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setEditLimit(!editLimit)}
          >
            {editLimit ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editLimit ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              type="number"
              value={limitValue}
              onChange={(e) => setLimitValue(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => setEditLimit(false)}>
              Save
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            ${parseInt(limitValue).toLocaleString()}
          </div>
        )}
      </div>

      {/* Rolling spend progress */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Current Rolling Spend
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: barColor }}>
            ${dowConfig.currentRollingSpendUsd.toLocaleString()} ({spendPct.toFixed(1)}%)
          </span>
        </div>
        <div
          style={{
            height: 10,
            background: 'var(--color-border)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(spendPct, 100)}%`,
              height: '100%',
              background: barColor,
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        {/* Alert threshold marker */}
        <div style={{ position: 'relative', height: 12 }}>
          <div
            style={{
              position: 'absolute',
              left: `${dowConfig.alertThresholdPct}%`,
              top: 0,
              width: 1,
              height: 8,
              background: 'var(--color-accent-yellow)',
              transform: 'translateX(-50%)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: `${dowConfig.alertThresholdPct}%`,
              top: 8,
              fontSize: 9,
              color: 'var(--color-accent-yellow)',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
            }}
          >
            Alert at {dowConfig.alertThresholdPct}%
          </span>
        </div>
      </div>

      {/* Last triggered */}
      <div
        style={{
          padding: 'var(--space-3)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          Last DoW Trigger
        </span>
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {timeAgo(dowConfig.lastTriggeredTs)}
        </span>
      </div>
    </div>
  );
}
