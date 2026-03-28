import type { AgentStatus, ApprovalState } from '../../types';

type StatusValue = AgentStatus | ApprovalState | string;

const STATUS_CONFIG: Record<string, { bg: string; color: string; label?: string }> = {
  // Agent statuses
  HEALTHY: { bg: 'var(--color-accent-green-subtle)', color: 'var(--color-accent-green)' },
  DEGRADED: { bg: 'var(--color-accent-yellow-subtle)', color: 'var(--color-accent-yellow)' },
  UNAVAILABLE: { bg: 'var(--color-accent-red-subtle)', color: 'var(--color-accent-red)' },
  ISOLATED: { bg: 'var(--color-accent-orange-subtle)', color: 'var(--color-accent-orange)' },
  SUSPENDED: { bg: 'var(--color-accent-purple-subtle)', color: 'var(--color-accent-purple)' },

  // Approval states
  PENDING_SIMULATION: { bg: 'var(--color-accent-blue-subtle)', color: 'var(--color-accent-blue)', label: 'Pending Sim' },
  SIMULATION_PASSED: { bg: 'var(--color-accent-green-subtle)', color: 'var(--color-accent-green)', label: 'Sim Passed' },
  REQUIRE_HUMAN_APPROVAL: { bg: 'var(--color-accent-yellow-subtle)', color: 'var(--color-accent-yellow)', label: 'Needs Approval' },
  APPROVED: { bg: 'var(--color-accent-green-subtle)', color: 'var(--color-accent-green)' },
  REJECTED: { bg: 'var(--color-accent-red-subtle)', color: 'var(--color-accent-red)' },
  EXECUTED: { bg: 'var(--color-accent-blue-subtle)', color: 'var(--color-accent-blue)' },
  ROLLED_BACK: { bg: 'var(--color-accent-orange-subtle)', color: 'var(--color-accent-orange)', label: 'Rolled Back' },

  // Simulation statuses
  PENDING: { bg: 'var(--color-accent-blue-subtle)', color: 'var(--color-accent-blue)' },
  RUNNING: { bg: 'var(--color-accent-yellow-subtle)', color: 'var(--color-accent-yellow)' },
  PASSED: { bg: 'var(--color-accent-green-subtle)', color: 'var(--color-accent-green)' },
  FAILED: { bg: 'var(--color-accent-red-subtle)', color: 'var(--color-accent-red)' },
  SKIPPED: { bg: 'rgba(139, 148, 158, 0.1)', color: 'var(--color-text-secondary)' },
};

interface StatusBadgeProps {
  status: StatusValue;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function StatusBadge({ status, size = 'md', dot = false }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    bg: 'rgba(139, 148, 158, 0.1)',
    color: 'var(--color-text-secondary)',
  };

  const label = config.label ?? status.replace(/_/g, ' ');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '2px 7px' : '3px 10px',
        borderRadius: 'var(--radius-full)',
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.color}4D`,
        fontSize: size === 'sm' ? '10px' : '11px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: config.color,
            flexShrink: 0,
            boxShadow: '0 0 6px currentColor',
            animation: ['HEALTHY', 'APPROVED', 'PASSED'].includes(status) ? 'pulse 3s ease-in-out infinite' : undefined,
          }}
        />
      )}
      {label}
    </span>
  );
}
