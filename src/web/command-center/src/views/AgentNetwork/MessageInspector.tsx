import type { A2AMessage } from '../../types';

interface MessageInspectorProps {
  message: A2AMessage | null;
  recentMessages: A2AMessage[];
  onSelect: (msg: A2AMessage) => void;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const TASK_COLORS: Record<string, string> = {
  ANOMALY_DETECTED: 'var(--color-accent-red)',
  ACTION_PROPOSED: 'var(--color-accent-blue)',
  GOVERNANCE_CHECK: 'var(--color-accent-yellow)',
  CARBON_ANALYSIS: 'var(--color-accent-green)',
  ROI_CALCULATION: 'var(--color-accent-purple)',
  SIMULATION_REQUEST: 'var(--color-accent-orange)',
  APPROVAL_REQUIRED: 'var(--color-accent-yellow)',
  EXECUTION_COMPLETE: 'var(--color-accent-green)',
};

export function MessageInspector({ message, recentMessages, onSelect }: MessageInspectorProps) {
  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      {/* Selected message detail */}
      <div className="card" style={{ flex: 'none' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
          Message Inspector
        </div>

        {message ? (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {/* From → To */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-accent-blue)' }}>
                {message.fromAgent.replace(/_/g, ' ')}
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 18 }}>→</span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-accent-green)' }}>
                {message.toAgent.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Task type */}
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: `${TASK_COLORS[message.taskType] ?? 'var(--color-accent-blue)'}22`,
                  color: TASK_COLORS[message.taskType] ?? 'var(--color-accent-blue)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {message.taskType.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Payload */}
            <div
              style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'SF Mono, Fira Code, monospace',
                lineHeight: 1.5,
                marginBottom: 'var(--space-2)',
              }}
            >
              {message.payloadPreview}
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-muted)' }}>
              <span>{timeAgo(message.timestamp)}</span>
              <span style={{ color: 'var(--color-accent-blue)' }}>{message.latencyMs}ms</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
            Click a node to inspect messages
          </div>
        )}
      </div>

      {/* Recent messages feed */}
      <div className="card" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
          Recent Messages
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 320, overflowY: 'auto' }}>
          {recentMessages.slice(0, 12).map((msg) => (
            <div
              key={msg.messageId}
              onClick={() => onSelect(msg)}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                background: message?.messageId === msg.messageId ? 'var(--color-surface)' : 'transparent',
                border: `1px solid ${message?.messageId === msg.messageId ? 'var(--color-border)' : 'transparent'}`,
                transition: 'var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent-blue)' }}>
                  {msg.fromAgent.split('_')[0]}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>→</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent-green)' }}>
                  {msg.toAgent.split('_')[0]}
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{timeAgo(msg.timestamp)}</span>
              </div>
              <div style={{ fontSize: 10, color: TASK_COLORS[msg.taskType] ?? 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {msg.taskType.replace(/_/g, ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
