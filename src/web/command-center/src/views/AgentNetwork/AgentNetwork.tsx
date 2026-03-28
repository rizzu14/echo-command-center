import { useState } from 'react';
import { useEchoStore } from '../../store';
import { A2AGraph } from './A2AGraph';
import { MessageInspector } from './MessageInspector';
import type { A2AMessage } from '../../types';

export function AgentNetwork() {
  const { a2aMessages } = useEchoStore();
  const [selectedMessage, setSelectedMessage] = useState<A2AMessage | null>(null);

  const avgLatency = a2aMessages.length > 0
    ? Math.round(a2aMessages.reduce((s, m) => s + m.latencyMs, 0) / a2aMessages.length)
    : 0;

  const stats = [
    {
      label: 'Total Messages',
      value: a2aMessages.length,
      color: 'var(--color-accent-blue)',
      bg: 'var(--color-accent-blue-subtle)',
      border: 'rgba(79,163,247,0.2)',
      icon: '◎',
    },
    {
      label: 'Avg Latency',
      value: `${avgLatency}ms`,
      color: 'var(--color-accent-green)',
      bg: 'var(--color-accent-green-subtle)',
      border: 'rgba(52,208,88,0.2)',
      icon: '⚡',
    },
    {
      label: 'Active Channels',
      value: '6',
      color: 'var(--color-accent-purple)',
      bg: 'var(--color-accent-purple-subtle)',
      border: 'rgba(167,139,250,0.2)',
      icon: '◈',
    },
    {
      label: 'Messages/min',
      value: '~3',
      color: 'var(--color-accent-yellow)',
      bg: 'var(--color-accent-yellow-subtle)',
      border: 'rgba(240,180,41,0.2)',
      icon: '⬡',
    },
  ];

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 800,
          marginBottom: 4,
          letterSpacing: '-0.03em',
        }}>
          Agent Network
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
          Live A2A communication graph — agent-to-agent message flow and coordination
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: 'var(--space-4) var(--space-5)',
              background: stat.bg,
              border: `1px solid ${stat.border}`,
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              flex: 1,
              minWidth: 120,
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              cursor: 'default',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = `var(--shadow-md), 0 0 20px ${stat.border}`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 12,
                color: stat.color,
                filter: `drop-shadow(0 0 4px ${stat.color}80)`,
              }}>
                {stat.icon}
              </span>
              <span style={{
                fontSize: 9,
                color: stat.color,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                opacity: 0.8,
              }}>
                {stat.label}
              </span>
            </div>
            <span style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 800,
              color: stat.color,
              letterSpacing: '-0.03em',
              textShadow: `0 0 16px ${stat.color}40`,
            }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        {/* Graph */}
        <div
          className="card"
          style={{
            flex: 1,
            minHeight: 500,
            padding: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 'var(--space-4)',
              left: 'var(--space-4)',
              fontSize: 10,
              color: 'var(--color-text-muted)',
              zIndex: 1,
              background: 'rgba(8,12,18,0.7)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              backdropFilter: 'blur(4px)',
              fontWeight: 500,
            }}
          >
            Drag nodes · Click to inspect
          </div>
          <A2AGraph onSelectMessage={setSelectedMessage} />
        </div>

        {/* Inspector */}
        <MessageInspector
          message={selectedMessage}
          recentMessages={a2aMessages}
          onSelect={setSelectedMessage}
        />
      </div>
    </div>
  );
}
