import { useEchoStore } from '../../store';
import { ROISummaryCard } from './ROISummaryCard';
import { CostLeakageStream } from './CostLeakageStream';
import { AgentStatusRow } from './AgentStatusRow';
import { CarbonSavingsSummary } from './CarbonSavingsSummary';
import { MetricCard } from '../../components/shared/MetricCard';
import { AnimatedCounter } from '../../components/shared/AnimatedCounter';

export function Dashboard() {
  const { actions, costLeakageEvents, agents } = useEchoStore();

  const pendingApprovals = actions.filter((a) => a.approvalState === 'REQUIRE_HUMAN_APPROVAL').length;
  const totalProjectedSavings = actions
    .filter((a) => ['APPROVED', 'SIMULATION_PASSED', 'REQUIRE_HUMAN_APPROVAL'].includes(a.approvalState))
    .reduce((sum, a) => sum + a.projectedSavings, 0);
  const healthyAgents = agents.filter((a) => a.status === 'HEALTHY').length;

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 4 }}>
          Mission Control
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Real-time overview of ECHO's autonomous economic operations
        </p>
      </div>

      {/* Top metrics row */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-4)' }}>
        <MetricCard
          label="Pending Approvals"
          value={<AnimatedCounter value={pendingApprovals} />}
          accent={pendingApprovals > 0 ? 'var(--color-accent-yellow)' : 'var(--color-accent-green)'}
          icon="⚡"
          subValue="require human review"
        />
        <MetricCard
          label="Pipeline Savings"
          value={<>$<AnimatedCounter value={totalProjectedSavings / 1000} decimals={1} suffix="K" /></>}
          accent="var(--color-accent-green)"
          icon="💰"
          trend={12.4}
          trendLabel="vs last week"
        />
        <MetricCard
          label="Active Agents"
          value={<AnimatedCounter value={healthyAgents} suffix={`/${agents.length}`} />}
          accent="var(--color-accent-blue)"
          icon="◈"
          subValue="all systems nominal"
        />
        <MetricCard
          label="Anomalies Detected"
          value={<AnimatedCounter value={costLeakageEvents.length} />}
          accent="var(--color-accent-orange)"
          icon="⚠"
          trend={-8.2}
          trendLabel="vs yesterday"
        />
      </div>

      {/* ROI + Cost Leakage */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 2fr 1fr',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <ROISummaryCard />
        <CostLeakageStream />
        <CarbonSavingsSummary />
      </div>

      {/* Agent status row */}
      <AgentStatusRow />
    </div>
  );
}
