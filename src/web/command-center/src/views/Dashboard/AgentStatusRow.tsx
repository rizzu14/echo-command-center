import { useNavigate } from 'react-router-dom';
import { useEchoStore } from '../../store';
import { StatusBadge } from '../../components/shared/StatusBadge';
import type { AgentType } from '../../types';

const AGENT_ICONS: Record<AgentType, string> = {
  AUDITOR: '🔍',
  GOVERNOR: '⚖️',
  GREEN_ARCHITECT: '🌿',
  FINANCE: '💹',
};

const AGENT_ACCENT: Record<AgentType, string> = {
  AUDITOR: 'var(--color-accent-blue)',
  GOVERNOR: 'var(--color-accent-purple)',
  GREEN_ARCHITECT: 'var(--color-accent-green)',
  FINANCE: 'var(--color-accent-yellow)',
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function AgentStatusRow() {
  const agents = useEchoStore((s) => s.agents);
  const navigate = useNavigate();

  return (
    <div style={{ gridColumn: 'span 4' }}>
      <div className="section-header">
        <div>
          <div className="section-title">Agent Status</div>
          <div className="section-subtitle" style={{ marginTop: 2 }}>Live operational status across all agents</div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/agents')}
          style={{ gap: 6, color: 'var(--color-accent-blue)', fontWeight: 600 }}
        >
          View All
          <span style={{ opacity: 0.7 }}>→</span>
        </button>
      </div>
      <div className="grid-4">
        {agents.map((agent) => {
          const accent = AGENT_ACCENT[agent.type] ?? 'var(--color-accent-blue)';
          const isHealthy = agent.status === 'HEALTHY';

          return (
            <div
              key={agent.id}
              className="card"
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                border: isHealthy
                  ? '1px solid rgba(52,208,88,0.2)'
                  : '1px solid var(--color-border)',
                overflow: 'hidden',
              }}
              onClick={() => navigate('/agents')}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'translateY(-2px)';
                el.style.boxShadow = `var(--shadow-card-hover), 0 0 20px ${accent}12`;
                el.style.borderColor = `${accent}35`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = '';
                el.style.boxShadow = '';
                el.style.borderColor = isHealthy ? 'rgba(52,208,88,0.2)' : 'var(--color-border)';
              }}
            >
              {/* Subtle top gradient accent */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, ${accent}80, ${accent}20)`,
                  borderRadius: '14px 14px 0 0',
                }}
              />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)', paddingTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-lg)',
                      background: `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`,
                      border: `1px solid ${accent}25`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    {AGENT_ICONS[agent.type]}
                  </div>
                  <div>
                    <div style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      letterSpacing: '-0.01em',
                    }}>
                      {agent.name}
                    </div>
                    <div style={{
                      fontSize: 9,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      fontWeight: 600,
                    }}>
                      {agent.type.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                <div style={{ position: 'relative' }}>
                  {isHealthy && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: -3,
                        borderRadius: '50%',
                        background: 'var(--color-accent-green)',
                        opacity: 0.25,
                        animation: 'pulse-ring 2.5s ease-out infinite',
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: isHealthy ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
                      boxShadow: isHealthy
                        ? '0 0 8px var(--color-accent-green), 0 0 16px rgba(52,208,88,0.3)'
                        : '0 0 8px var(--color-accent-red)',
                      position: 'relative',
                      animation: isHealthy ? 'pulse-dot 2s ease-in-out infinite' : undefined,
                    }}
                  />
                </div>
              </div>

              <StatusBadge status={agent.status} size="sm" />

              {/* Health bar */}
              <div style={{ marginTop: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{
                    fontSize: 9,
                    color: 'var(--color-text-muted)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                  }}>
                    Health Score
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--color-accent-green)',
                    letterSpacing: '-0.01em',
                  }}>
                    {agent.healthScore}%
                  </span>
                </div>
                <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${agent.healthScore}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, rgba(52,208,88,0.6), var(--color-accent-green))',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                      boxShadow: '0 0 8px rgba(52,208,88,0.5)',
                    }}
                  />
                </div>
              </div>

              <div style={{
                marginTop: 'var(--space-3)',
                fontSize: 11,
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <span style={{
                  color: 'var(--color-accent-blue)',
                  fontWeight: 700,
                  fontSize: 13,
                }}>
                  {agent.actionsToday}
                </span>
                <span>actions today</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{timeAgo(agent.lastActionTs)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
