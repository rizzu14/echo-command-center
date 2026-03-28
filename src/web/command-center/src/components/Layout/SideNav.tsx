import { NavLink } from 'react-router-dom';
import { useEchoStore } from '../../store';

// Premium SVG icons for each nav item
const NavIcons: Record<string, JSX.Element> = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  agents: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5"/>
      <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7"/>
      <circle cx="19" cy="7" r="2" strokeWidth="1.5"/>
      <path d="M22 12c0-1.657-1.343-3-3-3" strokeWidth="1.5"/>
    </svg>
  ),
  actions: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  network: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <circle cx="4" cy="6" r="2"/>
      <circle cx="20" cy="6" r="2"/>
      <circle cx="4" cy="18" r="2"/>
      <circle cx="20" cy="18" r="2"/>
      <line x1="6" y1="7" x2="10" y2="11"/>
      <line x1="18" y1="7" x2="14" y2="11"/>
      <line x1="6" y1="17" x2="10" y2="13"/>
      <line x1="18" y1="17" x2="14" y2="13"/>
    </svg>
  ),
  governance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/' },
  { id: 'agents', label: 'Agents', path: '/agents' },
  { id: 'actions', label: 'Actions', path: '/actions' },
  { id: 'network', label: 'Network', path: '/network' },
  { id: 'governance', label: 'Governance', path: '/governance' },
];

// Accent colors per nav item
const NAV_ACCENT: Record<string, string> = {
  dashboard: '#4fa3f7',
  agents: '#a78bfa',
  actions: '#f87b2b',
  network: '#34d058',
  governance: '#f0483e',
};

export function SideNav() {
  const { sideNavCollapsed, setSideNavCollapsed, agents, killSwitchActive } = useEchoStore();

  const healthyCount = agents.filter((a) => a.status === 'HEALTHY').length;
  const systemHealth = Math.round((healthyCount / agents.length) * 100);
  const healthColor = systemHealth >= 90
    ? 'var(--color-accent-green)'
    : systemHealth >= 70
    ? 'var(--color-accent-yellow)'
    : 'var(--color-accent-red)';

  return (
    <nav
      style={{
        width: sideNavCollapsed ? 'var(--nav-width-collapsed)' : 'var(--nav-width)',
        minHeight: '100%',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fc 100%)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '2px 0 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Nav items */}
      <div style={{ flex: 1, padding: '12px 8px', paddingTop: 16 }}>
        {NAV_ITEMS.map((item) => {
          const accent = NAV_ACCENT[item.id];
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: sideNavCollapsed ? '10px 12px' : '10px 14px',
                margin: '2px 0',
                borderRadius: 10,
                color: isActive ? accent : 'var(--color-text-secondary)',
                background: isActive
                  ? `linear-gradient(90deg, ${accent}18 0%, ${accent}08 100%)`
                  : 'transparent',
                border: isActive ? `1px solid ${accent}30` : '1px solid transparent',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                whiteSpace: 'nowrap',
                justifyContent: sideNavCollapsed ? 'center' : 'flex-start',
                boxShadow: isActive ? `0 2px 8px ${accent}20` : 'none',
              })}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                if (!el.classList.contains('active')) {
                  el.style.background = `${accent}10`;
                  el.style.color = accent;
                  el.style.border = `1px solid ${accent}20`;
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                if (!el.classList.contains('active')) {
                  el.style.background = 'transparent';
                  el.style.color = 'var(--color-text-secondary)';
                  el.style.border = '1px solid transparent';
                }
              }}
            >
              {/* Icon container with colored bg when active */}
              <span style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'transparent',
                transition: 'all 0.15s ease',
              }}>
                {NavIcons[item.id]}
              </span>
              {!sideNavCollapsed && (
                <span style={{ letterSpacing: '-0.01em', fontWeight: 'inherit' }}>
                  {item.label}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom section */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: 12,
          background: 'rgba(248,249,252,0.8)',
        }}
      >
        {/* System health */}
        {!sideNavCollapsed && (
          <div
            style={{
              padding: 12,
              background: 'white',
              borderRadius: 10,
              marginBottom: 8,
              border: '1px solid var(--color-border)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{
                fontSize: 9,
                color: 'var(--color-text-muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                System Health
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: healthColor,
                letterSpacing: '-0.01em',
              }}>
                {systemHealth}%
              </span>
            </div>
            <div style={{
              height: 5,
              background: 'var(--color-border)',
              borderRadius: 99,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${systemHealth}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${healthColor}88, ${healthColor})`,
                borderRadius: 99,
                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: `0 0 8px ${healthColor}60`,
              }} />
            </div>
            {killSwitchActive && (
              <div style={{
                marginTop: 8,
                fontSize: 9,
                color: 'var(--color-accent-red)',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                animation: 'pulse 1.5s ease-in-out infinite',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                Kill Switch Active
              </div>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setSideNavCollapsed(!sideNavCollapsed)}
          style={{
            width: '100%',
            padding: '8px',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-emphasis)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
          }}
          title={sideNavCollapsed ? 'Expand' : 'Collapse'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {sideNavCollapsed
              ? <><polyline points="9 18 15 12 9 6"/></>
              : <><polyline points="15 18 9 12 15 6"/></>
            }
          </svg>
        </button>
      </div>
    </nav>
  );
}
