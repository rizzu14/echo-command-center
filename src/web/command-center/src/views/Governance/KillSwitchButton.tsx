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
          background: killSwitchActive
            ? 'linear-gradient(135deg, rgba(240,72,62,0.08) 0%, rgba(240,72,62,0.04) 100%)'
            : 'var(--color-background-secondary)',
          backgroundImage: killSwitchActive ? undefined : 'linear-gradient(145deg, rgba(255,255,255,0.025) 0%, transparent 60%)',
          border: killSwitchActive
            ? '1px solid rgba(240,72,62,0.5)'
            : '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
          animation: killSwitchActive ? 'borderPulse 1.5s ease-in-out infinite' : 'none',
          boxShadow: killSwitchActive
            ? '0 0 40px rgba(240,72,62,0.15), var(--shadow-card)'
            : 'var(--shadow-card)',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow when active */}
        {killSwitchActive && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 200,
            height: 200,
            background: 'radial-gradient(circle, rgba(240,72,62,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{ marginBottom: 'var(--space-5)', position: 'relative' }}>
          <div style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 700,
            color: killSwitchActive ? 'var(--color-accent-red)' : 'var(--color-text-primary)',
            marginBottom: 6,
            letterSpacing: '-0.02em',
          }}>
            Emergency Control
          </div>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
          }}>
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
                padding: 'var(--space-3) var(--space-5)',
                background: 'rgba(240,72,62,0.12)',
                border: '1px solid rgba(240,72,62,0.5)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--color-accent-red)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 800,
                marginBottom: 'var(--space-5)',
                animation: 'pulse 1.5s ease-in-out infinite',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'currentColor',
                boxShadow: '0 0 8px currentColor',
              }} />
              Kill Switch Active — All Agents Halted
            </div>
            <br />
            <button
              className="btn btn-success btn-lg"
              onClick={handleResume}
              style={{ minWidth: 240, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 13 }}
            >
              ▶ Resume Operations
            </button>
          </div>
        ) : (
          <button
            className="btn btn-danger btn-lg"
            onClick={() => setShowModal(true)}
            style={{
              minWidth: 240,
              fontWeight: 800,
              letterSpacing: '0.06em',
              fontSize: 13,
              textTransform: 'uppercase',
            }}
          >
            ⬛ Emergency Stop
          </button>
        )}
      </div>

      {/* Confirmation modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setConfirmText(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--color-accent-red)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--color-accent-red-subtle)',
                  border: '1px solid var(--color-accent-red)',
                  fontSize: 14,
                }}>⚠</span>
                Confirm Emergency Stop
              </div>
              <button className="modal-close" onClick={() => { setShowModal(false); setConfirmText(''); }}>✕</button>
            </div>

            <div
              style={{
                padding: 'var(--space-4)',
                background: 'rgba(240,72,62,0.06)',
                border: '1px solid rgba(240,72,62,0.3)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--space-6)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.7,
                borderLeft: '3px solid var(--color-accent-red)',
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
                  boxShadow: confirmText === 'CONFIRM' ? '0 0 0 3px rgba(240,72,62,0.15)' : 'none',
                  borderRadius: 'var(--radius-md)',
                  color: confirmText === 'CONFIRM' ? 'var(--color-accent-red)' : 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  transition: 'all 0.18s ease',
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
                  opacity: confirmText === 'CONFIRM' ? 1 : 0.35,
                  cursor: confirmText === 'CONFIRM' ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                ⬛ Halt All Agents
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
