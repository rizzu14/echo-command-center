import { useState } from 'react';
import type { Agent } from '../../types';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ConfidenceBar } from '../../components/shared/ConfidenceBar';

const AGENT_ICONS: Record<string, string> = {
  AUDITOR: '🔍',
  GOVERNOR: '⚖️',
  GREEN_ARCHITECT: '🌿',
  FINANCE: '💹',
};

const AGENT_ACCENT: Record<string, string> = {
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

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const accent = AGENT_ACCENT[agent.type] ?? 'var(--color-accent-blue)';
  const isHealthy = agent.status === 'HEALTHY';

  return (
    <div
      className="card"
      style={{
        border: isHealthy
          ? '1px solid rgba(52, 208, 88, 0.2)'
          : '1px solid var(--color-border)',
        boxShadow: isHealthy
          ? 'var(--shadow-card), 0 0 0 1px rgba(52,208,88,0.1)'
          : 'var(--shadow-card)',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = isHealthy
          ? 'var(--shadow-card-hover), 0 0 20px rgba(52,208,88,0.12)'
          : 'var(--shadow-card-hover)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = '';
        el.style.boxShadow = isHealthy
          ? 'var(--shadow-card), 0 0 0 1px rgba(52,208,88,0.1)'
          : 'var(--shadow-card)';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 'var(--radius-xl)',
              background: `linear-gradient(135deg, ${accent}20 0%, ${accent}08 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              border: `1px solid ${accent}30`,
              boxShadow: `0 0 12px ${accent}15`,
            }}
          >
            {AGENT_ICONS[agent.type]}
          </div>
          <div>
            <div style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}>
              {agent.name}
            </div>
            <div style={{
              fontSize: 9,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginTop: 2,
              fontWeight: 600,
            }}>
              {agent.type.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <StatusBadge status={agent.status} dot />
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <ConfidenceBar value={agent.confidenceThreshold} label="Confidence Threshold" />
        <ConfidenceBar value={agent.reasoningAccuracy} label="Reasoning Accuracy" />

        <div style={{
          display: 'flex',
          gap: 'var(--space-3)',
          marginTop: 'var(--space-1)',
          padding: 'var(--space-3)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
              Health
            </div>
            <div style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 800,
              color: 'var(--color-accent-green)',
              letterSpacing: '-0.02em',
            }}>
              {agent.healthScore}%
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--color-border)', margin: '4px 0' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
              Hallucination
            </div>
            <div style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 800,
              color: agent.hallucinationRate < 2 ? 'var(--color-accent-green)' : 'var(--color-accent-yellow)',
              letterSpacing: '-0.02em',
            }}>
              {agent.hallucinationRate.toFixed(1)}%
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--color-border)', margin: '4px 0' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
              Actions
            </div>
            <div style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 800,
              color: 'var(--color-accent-blue)',
              letterSpacing: '-0.02em',
            }}>
              {agent.actionsToday}
            </div>
          </div>
        </div>
      </div>

      {/* Last action */}
      <div
        style={{
          marginTop: 'var(--space-3)',
          padding: 'var(--space-2) var(--space-3)',
          background: 'rgba(79,163,247,0.05)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
          borderLeft: '2px solid var(--color-accent-blue)',
          lineHeight: 1.5,
        }}
      >
        <span style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{timeAgo(agent.lastActionTs)} · </span>
        {agent.lastAction}
      </div>

      {/* Deep reasoning toggle */}
      {agent.lastReasoningChain && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%',
              justifyContent: 'space-between',
              padding: 'var(--space-2) var(--space-3)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              fontSize: 11,
              transition: 'var(--transition-base)',
            }}
          >
            <span>Deep Reasoning View</span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded && (
            <div
              style={{
                marginTop: 'var(--space-2)',
                padding: 'var(--space-3)',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.7,
                fontFamily: 'var(--font-mono)',
                animation: 'fadeIn 0.2s ease',
                border: '1px solid var(--color-border)',
                borderLeft: '2px solid var(--color-accent-purple)',
              }}
            >
              {agent.lastReasoningChain}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
