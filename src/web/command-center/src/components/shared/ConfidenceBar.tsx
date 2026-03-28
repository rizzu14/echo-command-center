interface ConfidenceBarProps {
  value: number; // 0-100
  height?: number;
  showLabel?: boolean;
  label?: string;
}

function getColor(value: number) {
  if (value >= 90) return 'var(--color-accent-green)';
  if (value >= 70) return 'var(--color-accent-yellow)';
  return 'var(--color-accent-red)';
}

export function ConfidenceBar({ value, height = 5, showLabel = true, label }: ConfidenceBarProps) {
  const color = getColor(value);

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{
            fontSize: 10,
            color: 'var(--color-text-muted)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {label ?? 'Confidence'}
          </span>
          <span style={{
            fontSize: 11,
            color,
            fontWeight: 800,
            letterSpacing: '-0.01em',
          }}>
            {value.toFixed(1)}%
          </span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height,
          background: 'var(--color-border)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color}70, ${color})`,
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 8px ${color}50`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shimmer highlight */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 'var(--radius-full)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
