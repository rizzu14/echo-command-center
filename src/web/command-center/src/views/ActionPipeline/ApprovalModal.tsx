import type { Action } from '../../types';
import { useEchoStore } from '../../store';
import { RiskBadge } from '../../components/shared/RiskBadge';
import { StatusBadge } from '../../components/shared/StatusBadge';

interface ApprovalModalProps {
  action: Action;
  onClose: () => void;
}

export function ApprovalModal({ action, onClose }: ApprovalModalProps) {
  const { updateAction } = useEchoStore();

  const handleApprove = () => {
    updateAction(action.actionId, { approvalState: 'APPROVED' });
    onClose();
  };

  const handleReject = () => {
    updateAction(action.actionId, { approvalState: 'REJECTED' });
    onClose();
  };

  // Risk gauge
  const riskAngle = (action.riskScore / 100) * 180;
  const riskColor =
    action.riskScore < 30 ? 'var(--color-accent-green)' :
    action.riskScore < 70 ? 'var(--color-accent-yellow)' :
    'var(--color-accent-red)';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Action Review</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2, fontFamily: 'SF Mono, Fira Code, monospace' }}>
              {action.actionId}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Action details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Action Type</div>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>{action.type.replace(/_/g, ' ')}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Reasoning Tier</div>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-accent-purple)' }}>{action.reasoningTier}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Target Resources</div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontFamily: 'SF Mono, Fira Code, monospace', color: 'var(--color-text-secondary)' }}>
              {action.targetResources.join(', ')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Simulation</div>
            <StatusBadge status={action.simulationStatus} size="sm" />
          </div>
        </div>

        {/* Risk gauge */}
        <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Risk Score</div>
            <svg width="120" height="70" viewBox="0 0 120 70">
              {/* Background arc */}
              <path
                d="M 10 60 A 50 50 0 0 1 110 60"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Risk arc */}
              <path
                d="M 10 60 A 50 50 0 0 1 110 60"
                fill="none"
                stroke={riskColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(riskAngle / 180) * 157} 157`}
              />
              <text x="60" y="55" textAnchor="middle" fill={riskColor} fontSize="20" fontWeight="800">
                {action.riskScore}
              </text>
            </svg>
          </div>

          {/* Cost math summary */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Cost Impact</div>
            <div
              style={{
                fontFamily: 'SF Mono, Fira Code, monospace',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {action.costMath.formula}
            </div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-accent-green)' }}>
              ${action.costMath.projectedMonthlySavings.toLocaleString()}/mo
            </div>
          </div>
        </div>

        {/* Reasoning */}
        {action.reasoning && (
          <div
            style={{
              padding: 'var(--space-3)',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-6)',
            }}
          >
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>AI Reasoning</div>
            {action.reasoning}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleReject}>Reject Action</button>
          <button className="btn btn-success" onClick={handleApprove}>Approve Action</button>
        </div>
      </div>
    </div>
  );
}
