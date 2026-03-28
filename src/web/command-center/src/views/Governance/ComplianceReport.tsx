import { useEchoStore } from '../../store';

export function ComplianceReport() {
  const report = useEchoStore((s) => s.governanceReport);

  if (!report) return null;

  const cards = [
    {
      label: 'Actions Taken',
      value: report.actionsTotal,
      color: 'var(--color-accent-blue)',
      bg: 'var(--color-accent-blue-subtle)',
      icon: '⚡',
      note: 'total pipeline actions',
    },
    {
      label: 'Actions Blocked',
      value: report.actionsBlocked,
      color: report.actionsBlocked > 0 ? 'var(--color-accent-yellow)' : 'var(--color-accent-green)',
      bg: report.actionsBlocked > 0 ? 'var(--color-accent-yellow-subtle)' : 'var(--color-accent-green-subtle)',
      icon: '⊘',
      note: 'by governance policy',
    },
    {
      label: 'Kill-Switch Events',
      value: report.killSwitchEvents,
      color: report.killSwitchEvents > 0 ? 'var(--color-accent-red)' : 'var(--color-accent-green)',
      bg: report.killSwitchEvents > 0 ? 'var(--color-accent-red-subtle)' : 'var(--color-accent-green-subtle)',
      icon: '⬛',
      note: 'emergency stops',
    },
    {
      label: 'DoW Triggers',
      value: report.dowTriggers,
      color: report.dowTriggers > 0 ? 'var(--color-accent-orange)' : 'var(--color-accent-green)',
      bg: report.dowTriggers > 0 ? 'var(--color-accent-orange-subtle)' : 'var(--color-accent-green-subtle)',
      icon: '⚠',
      note: 'spend limit hits',
    },
  ];

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="section-title">Compliance Report</div>
          <div className="section-subtitle">Daily governance summary · {report.date}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Compliance Score</span>
          <span
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 800,
              color: report.complianceScore >= 95 ? 'var(--color-accent-green)' : 'var(--color-accent-yellow)',
            }}
          >
            {report.complianceScore}%
          </span>
        </div>
      </div>

      <div className="grid-4">
        {cards.map((card) => (
          <div
            key={card.label}
            style={{
              padding: 'var(--space-4)',
              background: card.bg,
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${card.color}33`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 'var(--space-2)' }}>{card.icon}</div>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: card.color, lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: card.color, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {card.label}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {card.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
