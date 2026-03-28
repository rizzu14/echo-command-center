import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';import { useEchoStore } from '../../store';

const TENANTS = ['ACME Corp', 'Globex Industries', 'Initech LLC', 'Umbrella Corp'];

const NAV_LINKS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Agents', path: '/agents' },
  { label: 'Actions', path: '/actions' },
  { label: 'Network', path: '/network' },
  { label: 'Governance', path: '/governance' },
];

type SearchResult = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  path: string;
};

function useSearch(query: string): SearchResult[] {
  const { agents, actions, costLeakageEvents } = useEchoStore();

  return useCallback(() => {
    if (!query.trim() || query.length < 1) return [];
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    // Pages
    NAV_LINKS.forEach((nav) => {
      if (nav.label.toLowerCase().includes(q)) {
        results.push({
          id: `page-${nav.path}`,
          category: 'Page',
          title: nav.label,
          subtitle: `Navigate to ${nav.label}`,
          path: nav.path,
        });
      }
    });

    // Agents
    agents.forEach((agent) => {
      if (
        agent.name.toLowerCase().includes(q) ||
        agent.type.toLowerCase().includes(q) ||
        agent.status.toLowerCase().includes(q) ||
        agent.lastAction.toLowerCase().includes(q)
      ) {
        results.push({
          id: agent.id,
          category: 'Agent',
          title: agent.name,
          subtitle: agent.lastAction,
          badge: agent.status,
          badgeColor: agent.status === 'HEALTHY' ? '#34c759' : '#ff3b30',
          path: '/agents',
        });
      }
    });

    // Actions
    actions.forEach((action) => {
      if (
        action.actionId.toLowerCase().includes(q) ||
        action.type.toLowerCase().replace(/_/g, ' ').includes(q) ||
        action.approvalState.toLowerCase().replace(/_/g, ' ').includes(q) ||
        action.targetResources.some((r) => r.toLowerCase().includes(q)) ||
        (action.reasoning && action.reasoning.toLowerCase().includes(q))
      ) {
        results.push({
          id: action.actionId,
          category: 'Action',
          title: `${action.type.replace(/_/g, ' ')} — ${action.actionId}`,
          subtitle: `$${action.projectedSavings.toLocaleString()} savings · ${action.approvalState.replace(/_/g, ' ')}`,
          badge: action.approvalState.replace(/_/g, ' '),
          badgeColor:
            action.approvalState === 'APPROVED' || action.approvalState === 'EXECUTED'
              ? '#34c759'
              : action.approvalState === 'REQUIRE_HUMAN_APPROVAL'
              ? '#ff9f0a'
              : action.approvalState === 'REJECTED'
              ? '#ff3b30'
              : '#636366',
          path: '/actions',
        });
      }
    });

    // Cost leakage events
    costLeakageEvents.forEach((evt) => {
      if (
        evt.resourceId.toLowerCase().includes(q) ||
        evt.anomalyCategory.toLowerCase().replace(/_/g, ' ').includes(q) ||
        evt.region.toLowerCase().includes(q) ||
        evt.provider.toLowerCase().includes(q)
      ) {
        results.push({
          id: evt.eventId,
          category: 'Anomaly',
          title: `${evt.anomalyCategory.replace(/_/g, ' ')} — ${evt.resourceId}`,
          subtitle: `${evt.provider} · ${evt.region} · $${evt.hourlyCostUsd}/hr`,
          badge: evt.anomalyCategory.replace(/_/g, ' '),
          badgeColor: '#ff9f0a',
          path: '/actions',
        });
      }
    });

    return results.slice(0, 8);
  }, [query, agents, actions, costLeakageEvents])();
}

export function TopNav() {
  const navigate = useNavigate();
  const { wsConnected, killSwitchActive, selectedTenant, setSelectedTenant } = useEchoStore();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const results = useSearch(query);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIdx]) {
      navigate(results[selectedIdx].path);
      setOpen(false); setQuery('');
    }
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  }

  const categoryIcon: Record<string, string> = {
    Page: '📄',
    Agent: '🤖',
    Action: '⚡',
    Anomaly: '⚠️',
  };

  return (
    <header
      style={{
        height: 52,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 200,
      }}
    >
      {/* ── LEFT: Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}
        >
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logo-g1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6366f1"/>
                <stop offset="50%" stopColor="#8b5cf6"/>
                <stop offset="100%" stopColor="#06b6d4"/>
              </linearGradient>
              <linearGradient id="logo-g2" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#a5b4fc"/>
                <stop offset="100%" stopColor="#67e8f9"/>
              </linearGradient>
            </defs>
            {/* Outer hexagon */}
            <path d="M24 3 L42 13.5 L42 34.5 L24 45 L6 34.5 L6 13.5 Z" fill="url(#logo-g1)" opacity="0.12" stroke="url(#logo-g1)" strokeWidth="1.5"/>
            {/* Inner hexagon */}
            <path d="M24 10 L36 17 L36 31 L24 38 L12 31 L12 17 Z" fill="url(#logo-g1)" opacity="0.18" stroke="url(#logo-g2)" strokeWidth="1"/>
            {/* Center node */}
            <circle cx="24" cy="24" r="5" fill="url(#logo-g1)"/>
            <circle cx="24" cy="24" r="3" fill="white" opacity="0.9"/>
            {/* 6 spoke nodes */}
            <circle cx="24" cy="11" r="2.5" fill="url(#logo-g1)"/>
            <circle cx="35" cy="17.5" r="2.5" fill="url(#logo-g1)"/>
            <circle cx="35" cy="30.5" r="2.5" fill="url(#logo-g1)"/>
            <circle cx="24" cy="37" r="2.5" fill="url(#logo-g1)"/>
            <circle cx="13" cy="30.5" r="2.5" fill="url(#logo-g1)"/>
            <circle cx="13" cy="17.5" r="2.5" fill="url(#logo-g1)"/>
            {/* Spokes */}
            <line x1="24" y1="19" x2="24" y2="13.5" stroke="url(#logo-g2)" strokeWidth="1.2" opacity="0.7"/>
            <line x1="28.2" y1="21.5" x2="32.8" y2="19" stroke="url(#logo-g2)" strokeWidth="1.2" opacity="0.7"/>
            <line x1="28.2" y1="26.5" x2="32.8" y2="29" stroke="url(#logo-g2)" strokeWidth="1.2" opacity="0.7"/>
            <line x1="24" y1="29" x2="24" y2="34.5" stroke="url(#logo-g2)" strokeWidth="1.2" opacity="0.7"/>
            <line x1="19.8" y1="26.5" x2="15.2" y2="29" stroke="url(#logo-g2)" strokeWidth="1.2" opacity="0.7"/>
            <line x1="19.8" y1="21.5" x2="15.2" y2="19" stroke="url(#logo-g2)" strokeWidth="1.2" opacity="0.7"/>
          </svg>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.04em', color: '#1d1d1f', lineHeight: 1 }}>Echo</span>
            <span style={{
              fontSize: 16, fontWeight: 300, letterSpacing: '0.08em', lineHeight: 1,
              background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Junction</span>
          </div>
        </div>
      </div>

      {/* ── CENTER: Nav links ── */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {NAV_LINKS.map((item) => (
          <span
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              fontSize: 13, fontWeight: 400, color: '#1d1d1f',
              letterSpacing: '-0.01em', padding: '0 13px',
              cursor: 'pointer', opacity: 0.8, whiteSpace: 'nowrap',
              transition: 'opacity 0.15s ease', lineHeight: '52px', userSelect: 'none',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
          >
            {item.label}
          </span>
        ))}
      </div>

      {/* ── RIGHT: Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>

        {/* ── SEARCH ── */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 11px', borderRadius: 99,
            background: focused ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.055)',
            border: focused ? '1px solid rgba(0,0,0,0.3)' : '1px solid rgba(0,0,0,0.09)',
            width: 150,
            transition: 'all 0.2s ease',
            boxShadow: focused ? '0 0 0 3px rgba(0,0,0,0.06)' : 'none',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search agents, actions..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); setSelectedIdx(0); }}
              onFocus={() => { setFocused(true); if (query) setOpen(true); }}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 12, color: '#1d1d1f', fontFamily: 'inherit',
                width: '100%', letterSpacing: '-0.01em',
              }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
                style={{
                  background: 'rgba(0,0,0,0.12)', border: 'none', borderRadius: '50%',
                  width: 14, height: 14, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0,
                }}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {open && query.length > 0 && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                width: 360, maxHeight: 420, overflowY: 'auto',
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(20px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 12,
                boxShadow: '0 8px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
                zIndex: 999,
                overflow: 'hidden',
              }}
            >
              {results.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontSize: 13, color: '#1d1d1f', fontWeight: 500 }}>No results for "{query}"</div>
                  <div style={{ fontSize: 12, color: '#86868b', marginTop: 4 }}>Try searching for agents, actions, or resources</div>
                </div>
              ) : (
                <>
                  <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 600, color: '#86868b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                  </div>
                  {results.map((result, idx) => (
                    <div
                      key={result.id}
                      onClick={() => { navigate(result.path); setOpen(false); setQuery(''); }}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 12px', cursor: 'pointer',
                        background: idx === selectedIdx ? 'rgba(0,0,0,0.04)' : 'transparent',
                        transition: 'background 0.1s ease',
                        borderTop: idx > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                      }}
                    >
                      {/* Category icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: 'rgba(0,0,0,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15,
                      }}>
                        {categoryIcon[result.category] ?? '📌'}
                      </div>
                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{
                            fontSize: 12, fontWeight: 500, color: '#1d1d1f',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {result.title}
                          </span>
                          {result.badge && (
                            <span style={{
                              fontSize: 9, fontWeight: 600, padding: '1px 6px',
                              borderRadius: 99, flexShrink: 0,
                              background: `${result.badgeColor}18`,
                              color: result.badgeColor,
                              border: `1px solid ${result.badgeColor}40`,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              {result.badge}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#86868b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {result.subtitle}
                        </div>
                      </div>
                      {/* Category label */}
                      <span style={{ fontSize: 10, color: '#aeaeb2', flexShrink: 0, alignSelf: 'center' }}>
                        {result.category}
                      </span>
                    </div>
                  ))}
                  <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 10, color: '#aeaeb2' }}>↑↓ navigate</span>
                    <span style={{ fontSize: 10, color: '#aeaeb2' }}>↵ open</span>
                    <span style={{ fontSize: 10, color: '#aeaeb2' }}>esc close</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

        {/* Tenant */}
        <select
          value={selectedTenant}
          onChange={(e) => setSelectedTenant(e.target.value)}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#1d1d1f', fontSize: 12, fontWeight: 400,
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em',
          }}
        >
          {TENANTS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

        {/* Live status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: wsConnected ? '#34c759' : '#ff3b30',
            boxShadow: wsConnected ? '0 0 6px rgba(52,199,89,0.7)' : 'none',
            animation: wsConnected ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 12, color: wsConnected ? '#34c759' : '#ff3b30', fontWeight: 500 }}>
            {wsConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

        {/* Kill switch */}
        <button
          onClick={() => navigate('/governance')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 6,
            border: killSwitchActive ? '1px solid #34c759' : '1px solid rgba(0,0,0,0.15)',
            background: killSwitchActive ? 'rgba(52,199,89,0.08)' : 'transparent',
            color: killSwitchActive ? '#34c759' : '#1d1d1f',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '-0.01em',
            transition: 'all 0.15s ease', flexShrink: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = killSwitchActive ? 'rgba(52,199,89,0.12)' : 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = killSwitchActive ? 'rgba(52,199,89,0.08)' : 'transparent'; }}
        >
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: killSwitchActive ? '#34c759' : '#ff3b30',
            animation: !killSwitchActive ? 'pulse 2.5s ease-in-out infinite' : 'none',
          }} />
          {killSwitchActive ? 'Resume' : 'Kill Switch'}
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

        {/* User */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            cursor: 'pointer', padding: '3px 6px', borderRadius: 6,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1d1d1f 0%, #3a3a3c 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>JD</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#1d1d1f', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Jane Doe</span>
            <span style={{ fontSize: 9, color: '#86868b', whiteSpace: 'nowrap' }}>Platform Admin</span>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => { sessionStorage.removeItem('ej_auth'); navigate('/login'); }}
          style={{
            background: 'none', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6,
            padding: '4px 10px', fontSize: 11, color: '#86868b', cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '-0.01em', transition: 'all 0.15s ease', flexShrink: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.color = '#1d1d1f'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#86868b'; }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
