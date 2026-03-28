import { useState } from 'react';
import { useEchoStore } from '../../store';
import { ActionRow } from './ActionRow';
import type { ApprovalState } from '../../types';

const FILTER_OPTIONS: { label: string; value: ApprovalState | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Needs Approval', value: 'REQUIRE_HUMAN_APPROVAL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Executed', value: 'EXECUTED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Pending Sim', value: 'PENDING_SIMULATION' },
];

const FILTER_ALERT_VALUES: (ApprovalState | 'ALL')[] = ['REQUIRE_HUMAN_APPROVAL'];

export function ActionTable() {
  const actions = useEchoStore((s) => s.actions);
  const [filter, setFilter] = useState<ApprovalState | 'ALL'>('ALL');

  const filtered = filter === 'ALL' ? actions : actions.filter((a) => a.approvalState === filter);
  const pendingCount = actions.filter((a) => a.approvalState === 'REQUIRE_HUMAN_APPROVAL').length;

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="section-title">Action Pipeline</div>
          <div className="section-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>{actions.length} total actions</span>
            {pendingCount > 0 && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                color: 'var(--color-accent-yellow)',
                fontWeight: 700,
                fontSize: 11,
                background: 'rgba(240,180,41,0.1)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(240,180,41,0.25)',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                {pendingCount} awaiting approval
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map((opt) => {
          const count = opt.value === 'ALL'
            ? actions.length
            : actions.filter((a) => a.approvalState === opt.value).length;
          const isActive = filter === opt.value;
          const isAlert = FILTER_ALERT_VALUES.includes(opt.value) && count > 0;

          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                borderColor: isActive
                  ? isAlert ? 'rgba(240,180,41,0.5)' : 'var(--color-accent-blue)'
                  : 'var(--color-border)',
                background: isActive
                  ? isAlert ? 'rgba(240,180,41,0.1)' : 'var(--color-accent-blue-subtle)'
                  : 'transparent',
                color: isActive
                  ? isAlert ? 'var(--color-accent-yellow)' : 'var(--color-accent-blue)'
                  : 'var(--color-text-secondary)',
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {isAlert && !isActive && (
                <div style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--color-accent-yellow)',
                  animation: 'pulse 2s ease-in-out infinite',
                }} />
              )}
              {opt.label}
              {count > 0 && (
                <span
                  style={{
                    background: isActive
                      ? isAlert ? 'rgba(240,180,41,0.3)' : 'rgba(79,163,247,0.25)'
                      : 'var(--color-surface)',
                    color: isActive
                      ? isAlert ? 'var(--color-accent-yellow)' : 'var(--color-accent-blue)'
                      : 'var(--color-text-muted)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0 6px',
                    fontSize: 10,
                    fontWeight: 800,
                    lineHeight: '18px',
                    minWidth: 18,
                    textAlign: 'center',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action Type</th>
              <th>Resources</th>
              <th>Risk Score</th>
              <th>Confidence</th>
              <th>Simulation</th>
              <th>Approval State</th>
              <th>Savings</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((action) => (
              <ActionRow key={action.actionId} action={action} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
