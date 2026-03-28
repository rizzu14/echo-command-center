import { useEchoStore } from '../../store';
import { AgentCard } from './AgentCard';
import { ReasoningAccuracyChart } from './ReasoningAccuracyChart';
import { ModelPerformanceTable } from './ModelPerformanceTable';

export function AgentIntelligence() {
  const agents = useEchoStore((s) => s.agents);

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 4 }}>
          Agent Intelligence
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Deep diagnostics, reasoning accuracy, and model performance across all agents
        </p>
      </div>

      {/* Agent cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        <ReasoningAccuracyChart />
        <ModelPerformanceTable />
      </div>
    </div>
  );
}
