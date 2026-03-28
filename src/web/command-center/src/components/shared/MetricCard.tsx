import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  subValue?: string;
  trend?: number; // positive = up, negative = down
  trendLabel?: string;
  accent?: string;
  icon?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subValue,
  trend,
  trendLabel,
  accent,
  icon,
  className = '',
}: MetricCardProps) {
  const trendColor =
    trend === undefined
      ? 'var(--color-text-secondary)'
      : trend >= 0
      ? 'var(--color-accent-green)'
      : 'var(--color-accent-red)';

  return (
    <div
      className={`card ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {accent && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 3,
            height: '100%',
            background: accent,
            borderRadius: '4px 0 0 4px',
          }}
        />
      )}
      <div style={{ paddingLeft: accent ? 'var(--space-3)' : 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
          }}
        >
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 700,
            color: accent ?? 'var(--color-text-primary)',
            lineHeight: 1.2,
            marginBottom: 'var(--space-1)',
          }}
        >
          {value}
        </div>
        {(subValue || trend !== undefined) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
            {trend !== undefined && (
              <span style={{ color: trendColor, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
              </span>
            )}
            {trendLabel && (
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                {trendLabel}
              </span>
            )}
            {subValue && (
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                {subValue}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
