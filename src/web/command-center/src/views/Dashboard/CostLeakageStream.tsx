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
            padding: '4px 10px',
            background: 'rgba(52,208,88,0.08)',
            border: '1px solid rgba(52,208,88,0.25)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--color-accent-green)',
              boxShadow: '0 0 8px var(--color-accent-green), 0 0 16px rgba(52,208,88,0.4)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <span style={{
            fontSize: 10,
            color: 'var(--color-accent-green)',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            LIVE
          </span>
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
                padding: '8px var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: isNew
                  ? 'linear-gradient(90deg, rgba(52,208,88,0.05) 0%, transparent 80%)'
                  : 'transparent',
                border: isNew
                  ? '1px solid rgba(52,208,88,0.12)'
                  : '1px solid transparent',
                transition: 'var(--transition-fast)',
                animation: isNew ? 'fadeIn 0.35s ease' : 'none',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = isNew
                  ? 'linear-gradient(90deg, rgba(52,208,88,0.05) 0%, transparent 80%)'
                  : 'transparent';
                (e.currentTarget as HTMLElement).style.borderColor = isNew
                  ? 'rgba(52,208,88,0.12)'
                  : 'transparent';
              }}
            >
              {/* Category badge */}
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: cat.bg,
                  color: cat.color,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  flexShrink: 0,
                  minWidth: 72,
                  textAlign: 'center',
                  border: `1px solid ${cat.color}25`,
                  textTransform: 'uppercase',
                }}
              >
                {cat.label}
              </span>

              {/* Resource ID */}
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-primary)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                }}
              >
                {event.resourceId}
              </span>

              {/* Provider + region */}
              <span style={{
                fontSize: 10,
                color: 'var(--color-text-muted)',
                flexShrink: 0,
                fontWeight: 500,
              }}>
                {event.provider} · {event.region}
              </span>

              {/* Cost */}
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 800,
                  color: 'var(--color-accent-red)',
                  flexShrink: 0,
                  minWidth: 64,
                  textAlign: 'right',
                  letterSpacing: '-0.01em',
                  fontFamily: 'var(--font-mono)',
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
