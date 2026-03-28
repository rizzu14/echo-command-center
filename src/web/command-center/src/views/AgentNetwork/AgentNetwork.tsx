import { useState } from 'react';
import { useEchoStore } from '../../store';
import { A2AGraph } from './A2AGraph';
import { MessageInspector } from './MessageInspector';
import type { A2AMessage } from '../../types';

export function AgentNetwork() {
  const { a2aMessages } = useEchoStore();
  const [selectedMessage, setSelectedMessage] = useState<A2AMessage | null>(null);

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 4 }}>
          Agent Network
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Live A2A communication graph — agent-to-agent message flow and coordination
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Messages', value: a2aMessages.length, color: 'var(--color-accent-blue)' },
          { label: 'Avg Latency', value: `${Math.round(a2aMessages.reduce((s, m) => s + m.latencyMs, 0) / a2aMessages.length)}ms`, color: 'var(--color-accent-green)' },
          { label: 'Active Channels', value: '6', color: 'var(--color-accent-purple)' },
          { label: 'Messages/min', value: '~3', color: 'var(--color-accent-yellow)' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-background-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {stat.label}
            </span>
            <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: stat.color }}>
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
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
              zIndex: 1,
            }}
          >
            Drag nodes to rearrange · Click to inspect
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
