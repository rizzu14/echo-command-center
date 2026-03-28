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

  return (
    <div
      className="card"
      style={{
        border: agent.status === 'HEALTHY'
          ? '1px solid rgba(63, 185, 80, 0.2)'
          : '1px solid var(--color-border)',
        transition: 'var(--transition-base)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              border: '1px solid var(--color-border)',
            }}
          >
            {AGENT_ICONS[agent.type]}
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {agent.name}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>
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

        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
              Health Score
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-accent-green)' }}>
              {agent.healthScore}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
              Hallucination Rate
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 700,
                color: agent.hallucinationRate < 2 ? 'var(--color-accent-green)' : 'var(--color-accent-yellow)',
              }}
            >
              {agent.hallucinationRate.toFixed(1)}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
              Actions Today
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-accent-blue)' }}>
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
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
          borderLeft: '2px solid var(--color-accent-blue)',
        }}
      >
        <span style={{ color: 'var(--color-text-muted)' }}>{timeAgo(agent.lastActionTs)} · </span>
        {agent.lastAction}
      </div>

      {/* Deep reasoning toggle */}
      {agent.lastReasoningChain && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setExpanded(!expanded)}
            style={{ width: '100%', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)' }}
          >
            <span>Deep Reasoning View</span>
            <span>{expanded ? '▲' : '▼'}</span>
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
                lineHeight: 1.6,
                fontFamily: 'SF Mono, Fira Code, monospace',
                animation: 'fadeIn 0.2s ease',
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
