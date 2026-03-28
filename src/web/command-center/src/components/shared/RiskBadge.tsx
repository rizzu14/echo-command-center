interface RiskBadgeProps {
  score: number; // 0-100
  showLabel?: boolean;
}

function getRiskConfig(score: number) {
  if (score < 30) return { color: 'var(--color-accent-green)', bg: 'var(--color-accent-green-subtle)', label: 'LOW' };
  if (score < 70) return { color: 'var(--color-accent-yellow)', bg: 'var(--color-accent-yellow-subtle)', label: 'MED' };
  return { color: 'var(--color-accent-red)', bg: 'var(--color-accent-red-subtle)', label: 'HIGH' };
}

export function RiskBadge({ score, showLabel = false }: RiskBadgeProps) {
  const config = getRiskConfig(score);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        background: config.bg,
        color: config.color,
        fontSize: '11px',
        fontWeight: 'var(--font-weight-bold)',
        whiteSpace: 'nowrap',
      }}
    >
      {score}
      {showLabel && <span style={{ opacity: 0.8, fontWeight: 500 }}>{config.label}</span>}
    </span>
  );
}
