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
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              background: 'rgba(79,163,247,0.08)',
              border: '1px solid rgba(79,163,247,0.2)',
              borderRadius: 'var(--radius-full)',
              marginBottom: 'var(--space-2)',
            }}>
              <div style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--color-accent-green)',
                boxShadow: '0 0 6px var(--color-accent-green)',
                animation: 'pulse 2s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: 9,
                fontWeight: 800,
                color: 'var(--color-accent-blue)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                Live Operations
              </span>
            </div>
            <h1 style={{
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 800,
              marginBottom: 6,
              letterSpacing: '-0.04em',
              color: 'var(--color-text-primary)',
            }}>
              Mission Control
            </h1>
            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.6,
              maxWidth: 420,
            }}>
              Real-time overview of ECHO's autonomous economic operations
            </p>
          </div>

          {/* Quick status pill cluster */}
          <div style={{
            display: 'flex',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}>
            <div style={{
              padding: '6px 12px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              <span style={{ color: 'var(--color-accent-green)', fontWeight: 800 }}>
                {healthyAgents}/{agents.length}
              </span>
              agents healthy
            </div>
            {pendingApprovals > 0 && (
              <div style={{
                padding: '6px 12px',
                background: 'rgba(240,180,41,0.08)',
                border: '1px solid rgba(240,180,41,0.25)',
                borderRadius: 'var(--radius-full)',
                fontSize: 11,
                color: 'var(--color-accent-yellow)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                animation: 'pulse 3s ease-in-out infinite',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                {pendingApprovals} pending
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top metrics row */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
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
          marginBottom: 'var(--space-5)',
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
