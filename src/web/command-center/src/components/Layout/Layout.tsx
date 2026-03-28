import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { useRealtime } from '../../hooks/useRealtime';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useEchoStore } from '../../store';

export function Layout() {
  const selectedTenant = useEchoStore((s) => s.selectedTenant);

  useWebSocket(selectedTenant.toLowerCase().replace(/\s+/g, '-'));
  useRealtime();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 'var(--space-8) var(--space-6)',
          background: 'var(--color-background-primary)',
          backgroundImage: `
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(79,130,220,0.04) 0%, transparent 55%),
            radial-gradient(ellipse 70% 40% at 100% 100%, rgba(130,100,220,0.03) 0%, transparent 50%)
          `,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
