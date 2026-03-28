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
        <div className="section-title">Agent Status</div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/agents')}>
          View All →
        </button>
      </div>
      <div className="grid-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="card"
            style={{ cursor: 'pointer', transition: 'var(--transition-base)' }}
            onClick={() => navigate('/agents')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 20 }}>{AGENT_ICONS[agent.type]}</span>
                <div>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {agent.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {agent.type.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                {agent.status === 'HEALTHY' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -3,
                      borderRadius: '50%',
                      background: 'var(--color-accent-green)',
                      opacity: 0.3,
                      animation: 'pulse-ring 2s ease-out infinite',
                    }}
                  />
                )}
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: agent.status === 'HEALTHY' ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
                    position: 'relative',
                  }}
                />
              </div>
            </div>

            <StatusBadge status={agent.status} size="sm" />

            {/* Health bar */}
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Health
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent-green)' }}>
                  {agent.healthScore}%
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${agent.healthScore}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--color-accent-green)88, var(--color-accent-green))',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-3)', fontSize: 10, color: 'var(--color-text-muted)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{agent.actionsToday}</span> actions today
              · last {timeAgo(agent.lastActionTs)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
