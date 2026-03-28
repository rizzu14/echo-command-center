import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Action } from '../../types';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { RiskBadge } from '../../components/shared/RiskBadge';
import { CostMathPanel } from './CostMathPanel';
import { ApprovalModal } from './ApprovalModal';
import { useEchoStore } from '../../store';

const TIER_COLORS: Record<string, string> = {
  FAST: 'var(--color-accent-green)',
  MEDIUM: 'var(--color-accent-yellow)',
  DEEP: 'var(--color-accent-purple)',
};

interface ActionRowProps {
  action: Action;
}

export function ActionRow({ action }: ActionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { updateAction } = useEchoStore();

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateAction(action.actionId, { approvalState: 'REJECTED' });
  };

  return (
    <>
      <tr
        style={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <td>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
            {action.type.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'SF Mono, Fira Code, monospace', marginTop: 2 }}>
            {action.actionId}
          </div>
        </td>
        <td>
          <div style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'SF Mono, Fira Code, monospace', color: 'var(--color-text-secondary)' }}>
            {action.targetResources.slice(0, 2).join(', ')}
            {action.targetResources.length > 2 && (
              <span style={{ color: 'var(--color-text-muted)' }}> +{action.targetResources.length - 2}</span>
            )}
          </div>
        </td>
        <td><RiskBadge score={action.riskScore} showLabel /></td>
        <td>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: action.confidenceThreshold >= 90 ? 'var(--color-accent-green)' : 'var(--color-accent-yellow)' }}>
            {action.confidenceThreshold}%
          </span>
        </td>
        <td><StatusBadge status={action.simulationStatus} size="sm" /></td>
        <td><StatusBadge status={action.approvalState} size="sm" /></td>
        <td>
          <span style={{ fontWeight: 700, color: 'var(--color-accent-green)' }}>
            ${action.projectedSavings.toLocaleString()}/mo
          </span>
        </td>
        <td>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                background: `${TIER_COLORS[action.reasoningTier]}22`,
                color: TIER_COLORS[action.reasoningTier],
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {action.reasoningTier}
            </span>
            {action.approvalState === 'REQUIRE_HUMAN_APPROVAL' && (
              <>
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleApprove}
                  style={{ padding: '2px 8px', fontSize: 11 }}
                >
                  ✓
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleReject}
                  style={{ padding: '2px 8px', fontSize: 11 }}
                >
                  ✕
                </button>
              </>
            )}
            <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} style={{ padding: 0, border: 'none' }}>
            <CostMathPanel action={action} />
          </td>
        </tr>
      )}
      {showModal && createPortal(
        <ApprovalModal action={action} onClose={() => setShowModal(false)} />,
        document.body
      )}
    </>
  );
}
