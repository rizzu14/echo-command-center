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

export function ConfidenceBar({ value, height = 6, showLabel = true, label }: ConfidenceBarProps) {
  const color = getColor(value);

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {label ?? 'Confidence'}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color, fontWeight: 600 }}>
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
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}
