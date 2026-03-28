import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { SideNav } from './SideNav';
import { useRealtime } from '../../hooks/useRealtime';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useEchoStore } from '../../store';

export function Layout() {
  const selectedTenant = useEchoStore((s) => s.selectedTenant);

  // Initialize WebSocket (will gracefully fail if no backend)
  useWebSocket(selectedTenant.toLowerCase().replace(/\s+/g, '-'));

  // Simulate real-time data when no backend
  useRealtime();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SideNav />
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 'var(--space-6)',
            background: 'var(--color-background-primary)',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
