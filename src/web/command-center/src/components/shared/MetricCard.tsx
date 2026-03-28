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

  // Build a subtle glow on top of card from accent color
  const glowStyle = accent
    ? {
        boxShadow: `var(--shadow-card), 0 0 0 1px ${accent}22, 0 4px 20px ${accent}12`,
      }
    : {};

  return (
    <div
      className={`card ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...glowStyle,
        transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s cubic-bezier(0.4,0,0.2,1), border-color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = accent
          ? `var(--shadow-card-hover), 0 0 0 1px ${accent}33, 0 8px 32px ${accent}20`
          : 'var(--shadow-card-hover)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = accent
          ? `var(--shadow-card), 0 0 0 1px ${accent}22, 0 4px 20px ${accent}12`
          : 'var(--shadow-card)';
      }}
    >
      {/* Left accent bar */}
      {accent && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 3,
            height: '100%',
            background: `linear-gradient(180deg, ${accent} 0%, ${accent}66 100%)`,
            borderRadius: '4px 0 0 4px',
            boxShadow: `2px 0 10px ${accent}33`,
          }}
        />
      )}

      {/* Top-right glow orb */}
      {accent && (
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}16 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      <div style={{ paddingLeft: accent ? 'var(--space-3)' : 0, position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
          }}
        >
          {icon && (
            <span style={{
              fontSize: 15,
              lineHeight: 1,
              filter: accent ? `drop-shadow(0 0 4px ${accent}80)` : undefined,
            }}>
              {icon}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 800,
            color: accent ?? 'var(--color-text-primary)',
            lineHeight: 1.1,
            marginBottom: 'var(--space-1)',
            letterSpacing: '-0.03em',
            textShadow: accent ? `0 0 20px ${accent}40` : undefined,
          }}
        >
          {value}
        </div>
        {(subValue || trend !== undefined) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {trend !== undefined && (
              <span
                style={{
                  color: trendColor,
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 700,
                  background: `${trendColor}15`,
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${trendColor}30`,
                }}
              >
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
