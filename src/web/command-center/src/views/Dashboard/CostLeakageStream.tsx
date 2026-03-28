import { useEchoStore } from '../../store';
import type { AnomalyCategory } from '../../types';

const CATEGORY_CONFIG: Record<AnomalyCategory, { color: string; bg: string; label: string }> = {
  IDLE: { color: 'var(--color-accent-blue)', bg: 'var(--color-accent-blue-subtle)', label: 'IDLE' },
  OVER_PROVISIONED: { color: 'var(--color-accent-yellow)', bg: 'var(--color-accent-yellow-subtle)', label: 'OVER-PROV' },
  ORPHANED: { color: 'var(--color-accent-orange)', bg: 'var(--color-accent-orange-subtle)', label: 'ORPHANED' },
  USAGE_SPIKE: { color: 'var(--color-accent-red)', bg: 'var(--color-accent-red-subtle)', label: 'SPIKE' },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CostLeakageStream() {
  const events = useEchoStore((s) => s.costLeakageEvents);

  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <div className="section-header">
        <div>
          <div className="section-title">Cost Leakage Stream</div>
          <div className="section-subtitle">Real-time anomaly detection feed</div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-accent-green)',
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--color-accent-green)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          LIVE
        </div>
      </div>

      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {events.slice(0, 15).map((event, idx) => {
          const cat = CATEGORY_CONFIG[event.anomalyCategory];
          const isNew = idx < 2;

          return (
            <div
              key={event.eventId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: isNew ? 'rgba(63, 185, 80, 0.04)' : 'transparent',
                border: isNew ? '1px solid rgba(63, 185, 80, 0.1)' : '1px solid transparent',
                transition: 'var(--transition-base)',
                animation: isNew ? 'fadeIn 0.3s ease' : 'none',
              }}
            >
              {/* Category badge */}
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-full)',
                  background: cat.bg,
                  color: cat.color,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                  minWidth: 72,
                  textAlign: 'center',
                }}
              >
                {cat.label}
              </span>

              {/* Resource ID */}
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'SF Mono, Fira Code, monospace',
                  color: 'var(--color-text-primary)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {event.resourceId}
              </span>

              {/* Provider + region */}
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                {event.provider} · {event.region}
              </span>

              {/* Cost */}
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 700,
                  color: 'var(--color-accent-red)',
                  flexShrink: 0,
                  minWidth: 60,
                  textAlign: 'right',
                }}
              >
                ${event.hourlyCostUsd.toFixed(2)}/hr
              </span>

              {/* Time */}
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--color-text-muted)',
                  flexShrink: 0,
                  minWidth: 55,
                  textAlign: 'right',
                }}
              >
                {timeAgo(event.detectionTs)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
