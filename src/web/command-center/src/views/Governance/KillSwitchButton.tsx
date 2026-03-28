import { useState } from 'react';
import { useEchoStore } from '../../store';

export function KillSwitchButton() {
  const { killSwitchActive, setKillSwitchActive } = useEchoStore();
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleActivate = () => {
    if (confirmText === 'CONFIRM') {
      setKillSwitchActive(true);
      setShowModal(false);
      setConfirmText('');
    }
  };

  const handleResume = () => {
    setKillSwitchActive(false);
  };

  return (
    <>
      <div
        style={{
          padding: 'var(--space-8)',
          background: 'var(--color-background-secondary)',
          border: killSwitchActive
            ? '1px solid var(--color-accent-red)'
            : '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
          animation: killSwitchActive ? 'borderPulse 1.5s ease-in-out infinite' : 'none',
        }}
      >
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Emergency Control
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {killSwitchActive
              ? 'All autonomous agent actions are currently HALTED'
              : 'Immediately halt all autonomous agent actions'}
          </div>
        </div>

        {killSwitchActive ? (
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-4)',
                background: 'var(--color-accent-red-subtle)',
                border: '1px solid var(--color-accent-red)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-accent-red)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 700,
                marginBottom: 'var(--space-4)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            >
              <span style={{ fontSize: 16 }}>⬛</span>
              KILL SWITCH ACTIVE — ALL AGENTS HALTED
            </div>
            <br />
            <button
              className="btn btn-success btn-lg"
              onClick={handleResume}
              style={{ minWidth: 240 }}
            >
              ▶ RESUME OPERATIONS
            </button>
          </div>
        ) : (
          <button
            className="btn btn-danger btn-lg"
            onClick={() => setShowModal(true)}
            style={{
              minWidth: 240,
              fontWeight: 800,
              letterSpacing: '0.05em',
              fontSize: 'var(--font-size-md)',
            }}
          >
            ⬛ EMERGENCY STOP
          </button>
        )}
      </div>

      {/* Confirmation modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setConfirmText(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--color-accent-red)' }}>
                ⚠ Confirm Emergency Stop
              </div>
              <button className="modal-close" onClick={() => { setShowModal(false); setConfirmText(''); }}>✕</button>
            </div>

            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--color-accent-red-subtle)',
                border: '1px solid var(--color-accent-red)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-6)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.6,
              }}
            >
              This will <strong>immediately halt ALL autonomous agent actions</strong> across the entire platform.
              No new actions will be proposed, approved, or executed until operations are manually resumed.
            </div>

            <div style={{ marginBottom: 'var(--space-6)' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Type <strong style={{ color: 'var(--color-accent-red)' }}>CONFIRM</strong> to proceed:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CONFIRM"
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  background: 'var(--color-surface)',
                  border: `1px solid ${confirmText === 'CONFIRM' ? 'var(--color-accent-red)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setConfirmText(''); }}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleActivate}
                disabled={confirmText !== 'CONFIRM'}
                style={{
                  opacity: confirmText === 'CONFIRM' ? 1 : 0.4,
                  cursor: confirmText === 'CONFIRM' ? 'pointer' : 'not-allowed',
                }}
              >
                ⬛ HALT ALL AGENTS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
