import { useNavigate } from 'react-router-dom';
import { useEchoStore } from '../../store';

const TENANTS = ['ACME Corp', 'Globex Industries', 'Initech LLC', 'Umbrella Corp'];

export function TopNav() {
  const navigate = useNavigate();
  const { wsConnected, killSwitchActive, selectedTenant, setSelectedTenant } = useEchoStore();

  return (
    <header
      style={{
        height: 'var(--topnav-height)',
        background: 'var(--color-background-secondary)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-6)',
        gap: 'var(--space-4)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.5px',
          }}
        >
          E
        </div>
        <span
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 800,
            color: 'var(--color-accent-blue)',
            letterSpacing: '-0.5px',
          }}
        >
          ECHO
        </span>
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
            marginLeft: 2,
          }}
        >
          Command Center
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Tenant selector */}
      <select
        value={selectedTenant}
        onChange={(e) => setSelectedTenant(e.target.value)}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-primary)',
          padding: '5px 10px',
          fontSize: 'var(--font-size-sm)',
          cursor: 'pointer',
          minWidth: 160,
        }}
      >
        {TENANTS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* Connection status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '4px 10px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: wsConnected ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
            boxShadow: wsConnected
              ? '0 0 6px var(--color-accent-green)'
              : '0 0 6px var(--color-accent-red)',
            animation: wsConnected ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        />
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          {wsConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Kill switch quick access */}
      <button
        onClick={() => navigate('/governance')}
        className="btn btn-sm"
        style={{
          background: killSwitchActive ? 'var(--color-accent-green)' : 'var(--color-accent-red-subtle)',
          color: killSwitchActive ? 'white' : 'var(--color-accent-red)',
          border: `1px solid ${killSwitchActive ? 'var(--color-accent-green)' : 'var(--color-accent-red)'}`,
          fontWeight: 700,
          letterSpacing: '0.03em',
          animation: killSwitchActive ? 'borderPulse 1.5s ease-in-out infinite' : 'none',
        }}
      >
        {killSwitchActive ? '▶ RESUME' : '⬛ KILL SWITCH'}
      </button>

      {/* User avatar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #58a6ff, #bc8cff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: 'white',
          }}
        >
          JD
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Jane Doe
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'var(--color-accent-purple)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Platform Admin
          </span>
        </div>
      </div>
    </header>
  );
}
