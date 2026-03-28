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
          <div className="section-subtitle">
            {actions.length} total actions
            {pendingCount > 0 && (
              <span style={{ color: 'var(--color-accent-yellow)', fontWeight: 600, marginLeft: 8 }}>
                · {pendingCount} awaiting approval
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map((opt) => {
          const count = opt.value === 'ALL' ? actions.length : actions.filter((a) => a.approvalState === opt.value).length;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                borderColor: filter === opt.value ? 'var(--color-accent-blue)' : 'var(--color-border)',
                background: filter === opt.value ? 'var(--color-accent-blue-subtle)' : 'transparent',
                color: filter === opt.value ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition-base)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {opt.label}
              {count > 0 && (
                <span
                  style={{
                    background: filter === opt.value ? 'var(--color-accent-blue)' : 'var(--color-surface)',
                    color: filter === opt.value ? 'white' : 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0 5px',
                    fontSize: 10,
                    fontWeight: 700,
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
