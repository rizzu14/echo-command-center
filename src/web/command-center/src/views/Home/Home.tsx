import { useNavigate } from 'react-router-dom';
import { useEchoStore } from '../../store';

const CategoryIcons: Record<string, JSX.Element> = {
  dashboard: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="db1" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1"/><stop offset="1" stopColor="#818cf8"/>
        </linearGradient>
        <linearGradient id="db2" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a5b4fc"/><stop offset="1" stopColor="#c7d2fe"/>
        </linearGradient>
      </defs>
      {/* Bar chart */}
      <rect x="8" y="28" width="9" height="16" rx="3" fill="url(#db1)"/>
      <rect x="21" y="18" width="9" height="26" rx="3" fill="url(#db1)" opacity="0.85"/>
      <rect x="34" y="10" width="9" height="34" rx="3" fill="url(#db1)" opacity="0.7"/>
      {/* Top line */}
      <path d="M8 26 L17 16 L26 20 L43 8" stroke="url(#db2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="43" cy="8" r="3" fill="url(#db2)"/>
    </svg>
  ),
  agents: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="ag1" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6"/><stop offset="1" stopColor="#a78bfa"/>
        </linearGradient>
        <linearGradient id="ag2" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4b5fd"/><stop offset="1" stopColor="#ddd6fe"/>
        </linearGradient>
      </defs>
      {/* Head */}
      <rect x="14" y="8" width="24" height="22" rx="8" fill="url(#ag1)"/>
      {/* Eyes */}
      <circle cx="21" cy="18" r="3" fill="white"/>
      <circle cx="31" cy="18" r="3" fill="white"/>
      <circle cx="21" cy="18" r="1.5" fill="url(#ag1)"/>
      <circle cx="31" cy="18" r="1.5" fill="url(#ag1)"/>
      {/* Antenna */}
      <line x1="26" y1="8" x2="26" y2="4" stroke="url(#ag2)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="26" cy="3" r="2" fill="url(#ag2)"/>
      {/* Body */}
      <rect x="16" y="32" width="20" height="14" rx="5" fill="url(#ag1)" opacity="0.8"/>
      {/* Arms */}
      <rect x="8" y="33" width="7" height="10" rx="3.5" fill="url(#ag2)"/>
      <rect x="37" y="33" width="7" height="10" rx="3.5" fill="url(#ag2)"/>
      {/* Mouth */}
      <path d="M21 24 Q26 27 31 24" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  actions: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="ac1" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b"/><stop offset="1" stopColor="#fbbf24"/>
        </linearGradient>
        <linearGradient id="ac2" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a"/><stop offset="1" stopColor="#fef3c7"/>
        </linearGradient>
      </defs>
      {/* Lightning bolt */}
      <path d="M30 4 L14 28 L24 28 L22 48 L38 24 L28 24 Z" fill="url(#ac1)" stroke="url(#ac2)" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Glow circle behind */}
      <circle cx="26" cy="26" r="18" fill="url(#ac1)" opacity="0.12"/>
    </svg>
  ),
  network: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="nw1" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981"/><stop offset="1" stopColor="#34d399"/>
        </linearGradient>
        <linearGradient id="nw2" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6ee7b7"/><stop offset="1" stopColor="#a7f3d0"/>
        </linearGradient>
      </defs>
      {/* Center node */}
      <circle cx="26" cy="26" r="6" fill="url(#nw1)"/>
      <circle cx="26" cy="26" r="3.5" fill="white" opacity="0.9"/>
      {/* Outer nodes */}
      <circle cx="26" cy="8" r="4.5" fill="url(#nw1)" opacity="0.9"/>
      <circle cx="42" cy="18" r="4.5" fill="url(#nw1)" opacity="0.9"/>
      <circle cx="42" cy="34" r="4.5" fill="url(#nw1)" opacity="0.9"/>
      <circle cx="26" cy="44" r="4.5" fill="url(#nw1)" opacity="0.9"/>
      <circle cx="10" cy="34" r="4.5" fill="url(#nw1)" opacity="0.9"/>
      <circle cx="10" cy="18" r="4.5" fill="url(#nw1)" opacity="0.9"/>
      {/* Connections */}
      <line x1="26" y1="20" x2="26" y2="12.5" stroke="url(#nw2)" strokeWidth="1.8"/>
      <line x1="31" y1="23" x2="37.5" y2="20" stroke="url(#nw2)" strokeWidth="1.8"/>
      <line x1="31" y1="29" x2="37.5" y2="32" stroke="url(#nw2)" strokeWidth="1.8"/>
      <line x1="26" y1="32" x2="26" y2="39.5" stroke="url(#nw2)" strokeWidth="1.8"/>
      <line x1="21" y1="29" x2="14.5" y2="32" stroke="url(#nw2)" strokeWidth="1.8"/>
      <line x1="21" y1="23" x2="14.5" y2="20" stroke="url(#nw2)" strokeWidth="1.8"/>
    </svg>
  ),
  governance: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="gv1" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ef4444"/><stop offset="1" stopColor="#f87171"/>
        </linearGradient>
        <linearGradient id="gv2" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fca5a5"/><stop offset="1" stopColor="#fecaca"/>
        </linearGradient>
      </defs>
      {/* Shield */}
      <path d="M26 4 L42 11 L42 26 C42 35 34 42 26 46 C18 42 10 35 10 26 L10 11 Z" fill="url(#gv1)" opacity="0.9"/>
      {/* Inner shield highlight */}
      <path d="M26 9 L38 15 L38 26 C38 33 32 39 26 42 C20 39 14 33 14 26 L14 15 Z" fill="url(#gv2)" opacity="0.25"/>
      {/* Checkmark */}
      <path d="M18 26 L23 31 L34 20" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
};

const CATEGORIES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    bg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    desc: 'Mission Control',
  },
  {
    id: 'agents',
    label: 'Agents',
    path: '/agents',
    bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    desc: 'AI Intelligence',
  },
  {
    id: 'actions',
    label: 'Actions',
    path: '/actions',
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    desc: 'Pipeline & Approvals',
  },
  {
    id: 'network',
    label: 'Network',
    path: '/network',
    bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    desc: 'Agent Communication',
  },
  {
    id: 'governance',
    label: 'Governance',
    path: '/governance',
    bg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
    desc: 'Controls & Compliance',
  },
];

export function Home() {
  const navigate = useNavigate();
  const { agents, actions, roiSummary, costLeakageEvents } = useEchoStore();

  const healthyAgents = agents.filter((a) => a.status === 'HEALTHY').length;
  const pendingApprovals = actions.filter((a) => a.approvalState === 'REQUIRE_HUMAN_APPROVAL').length;
  const executedActions = actions.filter((a) => a.approvalState === 'EXECUTED').length;

  const latestItems = [
    {
      tag: 'LIVE',
      tagColor: '#34c759',
      title: `${pendingApprovals} Actions Pending`,
      subtitle: 'Require human approval',
      bg: '#1d1d1f',
      textColor: 'white',
      path: '/actions',
    },
    {
      tag: 'AGENTS',
      tagColor: '#007aff',
      title: `${healthyAgents}/${agents.length} Healthy`,
      subtitle: 'All systems nominal',
      bg: '#f5f5f7',
      textColor: '#1d1d1f',
      path: '/agents',
    },
    {
      tag: 'SAVINGS',
      tagColor: '#34c759',
      title: roiSummary ? `$${(roiSummary.totalSavingsUsd / 1_000_000).toFixed(1)}M Realized` : 'ROI Summary',
      subtitle: roiSummary ? `${roiSummary.cumulativeRoi}% cumulative ROI` : 'View dashboard',
      bg: '#f5f5f7',
      textColor: '#1d1d1f',
      path: '/',
    },
    {
      tag: 'ANOMALIES',
      tagColor: '#ff9f0a',
      title: `${costLeakageEvents.length} Detected`,
      subtitle: 'Cost leakage events',
      bg: '#f5f5f7',
      textColor: '#1d1d1f',
      path: '/actions',
    },
    {
      tag: 'EXECUTED',
      tagColor: '#007aff',
      title: `${executedActions} Completed`,
      subtitle: 'Actions executed today',
      bg: '#f5f5f7',
      textColor: '#1d1d1f',
      path: '/actions',
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 60px' }}>

      {/* ── HERO HEADER ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '48px 0 40px',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        marginBottom: 40,
      }}>
        <div>
          <h1 style={{
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: '#1d1d1f',
            lineHeight: 1.05,
            margin: 0,
          }}>
            Command Center
          </h1>
        </div>
        <div style={{ textAlign: 'right', paddingTop: 8 }}>
          <p style={{
            fontSize: 22,
            fontWeight: 500,
            color: '#1d1d1f',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            margin: '0 0 10px',
          }}>
            The smartest way to manage<br />your autonomous operations.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#007aff', fontSize: 14, fontWeight: 400,
              letterSpacing: '-0.01em', padding: 0, display: 'block',
              marginLeft: 'auto', fontFamily: 'inherit',
            }}
          >
            View live dashboard ↗
          </button>
          <button
            onClick={() => navigate('/agents')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#007aff', fontSize: 14, fontWeight: 400,
              letterSpacing: '-0.01em', padding: 0, display: 'block',
              marginLeft: 'auto', marginTop: 4, fontFamily: 'inherit',
            }}
          >
            Explore agents ↗
          </button>
        </div>
      </div>

      {/* ── CATEGORY SCROLL ROW ── */}
      <div style={{
        display: 'flex',
        gap: 16,
        overflowX: 'auto',
        paddingBottom: 8,
        marginBottom: 48,
        scrollbarWidth: 'none',
      }}>
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            onClick={() => navigate(cat.path)}
            style={{
              flexShrink: 0,
              width: 160,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'transform 0.18s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            {/* Icon card */}
            <div style={{
              width: '100%',
              height: 130,
              borderRadius: 20,
              background: cat.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
              boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
              border: '1px solid rgba(0,0,0,0.04)',
              transition: 'box-shadow 0.18s ease',
            }}>
              {CategoryIcons[cat.id]}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
              {cat.label}
            </div>
            <div style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>
              {cat.desc}
            </div>
          </div>
        ))}
      </div>

      {/* ── LATEST SECTION ── */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: '#1d1d1f',
          margin: '0 0 20px',
        }}>
          Live status.{' '}
          <span style={{ color: '#86868b', fontWeight: 400 }}>
            What's happening right now.
          </span>
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}>
          {latestItems.map((item, i) => (
            <div
              key={i}
              onClick={() => navigate(item.path)}
              style={{
                background: item.bg,
                borderRadius: 18,
                padding: '24px 20px',
                cursor: 'pointer',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.05)',
                minHeight: 140,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
              }}
            >
              <div>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: item.tagColor,
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 10,
                }}>
                  {item.tag}
                </span>
                <div style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: item.textColor,
                  lineHeight: 1.2,
                }}>
                  {item.title}
                </div>
              </div>
              <div style={{
                fontSize: 13,
                color: item.textColor === 'white' ? 'rgba(255,255,255,0.6)' : '#86868b',
                marginTop: 8,
                letterSpacing: '-0.01em',
              }}>
                {item.subtitle}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── QUICK ACTIONS ROW ── */}
      <div>
        <h2 style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: '#1d1d1f',
          margin: '0 0 20px',
        }}>
          Quick access.
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'View all agents', path: '/agents', icon: '🤖' },
            { label: 'Review pending actions', path: '/actions', icon: '⚡' },
            { label: 'Agent network graph', path: '/network', icon: '🔗' },
            { label: 'Governance controls', path: '/governance', icon: '🛡️' },
            { label: 'Mission control', path: '/', icon: '📊' },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 99,
                border: '1px solid rgba(0,0,0,0.15)',
                background: 'white',
                color: '#1d1d1f',
                fontSize: 13,
                fontWeight: 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '-0.01em',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#f5f5f7';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'white';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.15)';
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
