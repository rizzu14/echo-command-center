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
      border: 'rgba(79,163,247,0.25)',
      icon: '⚡',
      note: 'total pipeline actions',
    },
    {
      label: 'Actions Blocked',
      value: report.actionsBlocked,
      color: report.actionsBlocked > 0 ? 'var(--color-accent-yellow)' : 'var(--color-accent-green)',
      bg: report.actionsBlocked > 0 ? 'var(--color-accent-yellow-subtle)' : 'var(--color-accent-green-subtle)',
      border: report.actionsBlocked > 0 ? 'rgba(240,180,41,0.25)' : 'rgba(52,208,88,0.25)',
      icon: '⊘',
      note: 'by governance policy',
    },
    {
      label: 'Kill-Switch Events',
      value: report.killSwitchEvents,
      color: report.killSwitchEvents > 0 ? 'var(--color-accent-red)' : 'var(--color-accent-green)',
      bg: report.killSwitchEvents > 0 ? 'var(--color-accent-red-subtle)' : 'var(--color-accent-green-subtle)',
      border: report.killSwitchEvents > 0 ? 'rgba(240,72,62,0.25)' : 'rgba(52,208,88,0.25)',
      icon: '⬛',
      note: 'emergency stops',
    },
    {
      label: 'DoW Triggers',
      value: report.dowTriggers,
      color: report.dowTriggers > 0 ? 'var(--color-accent-orange)' : 'var(--color-accent-green)',
      bg: report.dowTriggers > 0 ? 'var(--color-accent-orange-subtle)' : 'var(--color-accent-green-subtle)',
      border: report.dowTriggers > 0 ? 'rgba(248,123,43,0.25)' : 'rgba(52,208,88,0.25)',
      icon: '⚠',
      note: 'spend limit hits',
    },
  ];

  const scoreColor = report.complianceScore >= 95
    ? 'var(--color-accent-green)'
    : report.complianceScore >= 80
    ? 'var(--color-accent-yellow)'
    : 'var(--color-accent-red)';

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="section-title">Compliance Report</div>
          <div className="section-subtitle">Daily governance summary · {report.date}</div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 14px',
          background: `${scoreColor}10`,
          border: `1px solid ${scoreColor}30`,
          borderRadius: 'var(--radius-full)',
        }}>
          <span style={{
            fontSize: 10,
            color: 'var(--color-text-muted)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Compliance
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 800,
              color: scoreColor,
              letterSpacing: '-0.03em',
              textShadow: `0 0 16px ${scoreColor}60`,
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
              padding: 'var(--space-5)',
              background: card.bg,
              borderRadius: 'var(--radius-xl)',
              border: `1px solid ${card.border}`,
              textAlign: 'center',
              transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              cursor: 'default',
              boxShadow: `0 0 0 1px ${card.border} inset`,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = `var(--shadow-md), 0 0 20px ${card.border}`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = '';
              el.style.boxShadow = `0 0 0 1px ${card.border} inset`;
            }}
          >
            <div style={{
              fontSize: 22,
              marginBottom: 'var(--space-2)',
              filter: `drop-shadow(0 0 6px ${card.color}80)`,
            }}>
              {card.icon}
            </div>
            <div style={{
              fontSize: 'var(--font-size-4xl)',
              fontWeight: 800,
              color: card.color,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              textShadow: `0 0 20px ${card.color}50`,
            }}>
              {card.value}
            </div>
            <div style={{
              fontSize: 9,
              fontWeight: 800,
              color: card.color,
              marginTop: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {card.label}
            </div>
            <div style={{
              fontSize: 10,
              color: 'var(--color-text-muted)',
              marginTop: 3,
              fontWeight: 500,
            }}>
              {card.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
