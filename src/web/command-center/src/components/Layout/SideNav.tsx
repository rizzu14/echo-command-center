import { NavLink } from 'react-router-dom';
import { useEchoStore } from '../../store';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: '⬡' },
  { id: 'agents', label: 'Agents', path: '/agents', icon: '◈' },
  { id: 'actions', label: 'Actions', path: '/actions', icon: '⚡' },
  { id: 'network', label: 'Network', path: '/network', icon: '◎' },
  { id: 'governance', label: 'Governance', path: '/governance', icon: '⊕' },
];

export function SideNav() {
  const { sideNavCollapsed, setSideNavCollapsed, agents, killSwitchActive } = useEchoStore();

  const healthyCount = agents.filter((a) => a.status === 'HEALTHY').length;
  const systemHealth = Math.round((healthyCount / agents.length) * 100);

  return (
    <nav
      style={{
        width: sideNavCollapsed ? 'var(--nav-width-collapsed)' : 'var(--nav-width)',
        minHeight: '100%',
        background: 'var(--color-background-secondary)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Nav items */}
      <div style={{ flex: 1, padding: 'var(--space-3) 0' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: sideNavCollapsed ? 'var(--space-3)' : 'var(--space-3) var(--space-4)',
              margin: '2px var(--space-2)',
              borderRadius: 'var(--radius-md)',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              background: isActive ? 'var(--color-surface)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--color-accent-blue)' : '2px solid transparent',
              textDecoration: 'none',
              fontSize: 'var(--font-size-sm)',
              fontWeight: isActive ? 600 : 400,
              transition: 'var(--transition-base)',
              whiteSpace: 'nowrap',
              justifyContent: sideNavCollapsed ? 'center' : 'flex-start',
            })}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
            {!sideNavCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Bottom section */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: 'var(--space-3)',
        }}
      >
        {/* System health */}
        {!sideNavCollapsed && (
          <div
            style={{
              padding: 'var(--space-3)',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                SYSTEM HEALTH
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 700,
                  color: systemHealth >= 90 ? 'var(--color-accent-green)' : 'var(--color-accent-yellow)',
                }}
              >
                {systemHealth}%
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: 'var(--color-border)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${systemHealth}%`,
                  height: '100%',
                  background: systemHealth >= 90 ? 'var(--color-accent-green)' : 'var(--color-accent-yellow)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
            {killSwitchActive && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  color: 'var(--color-accent-red)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              >
                ⬛ KILL SWITCH ACTIVE
              </div>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setSideNavCollapsed(!sideNavCollapsed)}
          style={{
            width: '100%',
            padding: 'var(--space-2)',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition-base)',
          }}
          title={sideNavCollapsed ? 'Expand' : 'Collapse'}
        >
          {sideNavCollapsed ? '→' : '←'}
        </button>
      </div>
    </nav>
  );
}
