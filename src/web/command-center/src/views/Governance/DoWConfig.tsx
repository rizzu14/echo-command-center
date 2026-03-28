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

  const warningBg = isDanger
    ? 'rgba(240,72,62,0.08)'
    : isWarning
    ? 'rgba(240,180,41,0.08)'
    : 'transparent';

  return (
    <div
      className="card"
      style={{
        border: isWarning
          ? `1px solid ${isDanger ? 'rgba(240,72,62,0.35)' : 'rgba(240,180,41,0.35)'}`
          : '1px solid var(--color-border)',
        background: isWarning
          ? `linear-gradient(135deg, ${warningBg} 0%, var(--color-background-secondary) 60%)`
          : undefined,
      }}
    >
      <div className="section-header">
        <div>
          <div className="section-title">Deed of Work (DoW) Limits</div>
          <div className="section-subtitle">Daily spend guardrails and rolling budget</div>
        </div>
        {isWarning && (
          <span
            style={{
              fontSize: 9,
              color: isDanger ? 'var(--color-accent-red)' : 'var(--color-accent-yellow)',
              fontWeight: 800,
              background: isDanger ? 'rgba(240,72,62,0.1)' : 'rgba(240,180,41,0.1)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              border: `1px solid ${isDanger ? 'rgba(240,72,62,0.3)' : 'rgba(240,180,41,0.3)'}`,
              animation: isDanger ? 'pulse 1.5s ease-in-out infinite' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
            {isDanger ? 'Near Limit' : 'Warning'}
          </span>
        )}
      </div>

      {/* Spend limit display/input */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <label style={{
            fontSize: 10,
            color: 'var(--color-text-muted)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            24h Spend Limit (USD)
          </label>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setEditLimit(!editLimit)}
            style={{ color: 'var(--color-accent-blue)', fontWeight: 600, fontSize: 11 }}
          >
            {editLimit ? 'Cancel' : '✎ Edit'}
          </button>
        </div>
        {editLimit ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              type="number"
              value={limitValue}
              onChange={(e) => setLimitValue(e.target.value)}
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontWeight: 600 }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => setEditLimit(false)}>
              Save
            </button>
          </div>
        ) : (
          <div style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.03em',
          }}>
            ${parseInt(limitValue).toLocaleString()}
          </div>
        )}
      </div>

      {/* Rolling spend progress */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{
            fontSize: 10,
            color: 'var(--color-text-muted)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Current Rolling Spend
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 800,
            color: barColor,
            fontFamily: 'var(--font-mono)',
          }}>
            ${dowConfig.currentRollingSpendUsd.toLocaleString()}
            <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, marginLeft: 5 }}>
              ({spendPct.toFixed(1)}%)
            </span>
          </span>
        </div>

        {/* Progress bar track */}
        <div style={{
          height: 10,
          background: 'var(--color-border)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div
            style={{
              width: `${Math.min(spendPct, 100)}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${barColor}80, ${barColor})`,
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: `0 0 10px ${barColor}60`,
            }}
          />
        </div>

        {/* Alert threshold marker */}
        <div style={{ position: 'relative', height: 18, marginTop: 2 }}>
          <div
            style={{
              position: 'absolute',
              left: `${dowConfig.alertThresholdPct}%`,
              top: 0,
              width: 1,
              height: 8,
              background: 'var(--color-accent-yellow)',
              transform: 'translateX(-50%)',
              boxShadow: '0 0 4px var(--color-accent-yellow)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: `${dowConfig.alertThresholdPct}%`,
              top: 9,
              fontSize: 9,
              color: 'var(--color-accent-yellow)',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            Alert at {dowConfig.alertThresholdPct}%
          </span>
        </div>
      </div>

      {/* Last triggered */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid var(--color-border)',
        }}
      >
        <span style={{
          fontSize: 10,
          color: 'var(--color-text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Last DoW Trigger
        </span>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>
          {timeAgo(dowConfig.lastTriggeredTs)}
        </span>
      </div>
    </div>
  );
}
