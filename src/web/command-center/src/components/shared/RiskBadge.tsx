interface RiskBadgeProps {
  score: number; // 0-100
  showLabel?: boolean;
}

function getRiskConfig(score: number) {
  if (score < 30) return {
    color: 'var(--color-accent-green)',
    bg: 'var(--color-accent-green-subtle)',
    label: 'LOW',
    fontWeight: 600,
    boxShadow: undefined as string | undefined,
  };
  if (score < 70) return {
    color: 'var(--color-accent-yellow)',
    bg: 'var(--color-accent-yellow-subtle)',
    label: 'MED',
    fontWeight: 700,
    boxShadow: '0 0 4px rgba(240,180,41,0.15)' as string | undefined,
  };
  return {
    color: 'var(--color-accent-red)',
    bg: 'var(--color-accent-red-subtle)',
    label: 'HIGH',
    fontWeight: 800,
    boxShadow: '0 0 8px rgba(240,72,62,0.25)' as string | undefined,
  };
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
        border: `1px solid ${config.color}59`,
        fontSize: '11px',
        fontWeight: config.fontWeight,
        whiteSpace: 'nowrap',
        boxShadow: config.boxShadow,
      }}
    >
      {score}
      {showLabel && <span style={{ opacity: 0.8 }}> · {config.label}</span>}
    </span>
  );
}
