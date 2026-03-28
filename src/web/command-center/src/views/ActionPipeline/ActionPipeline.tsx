import { useEchoStore } from '../../store';
import { ActionTable } from './ActionTable';
import { RollbackHistory } from './RollbackHistory';
import { MetricCard } from '../../components/shared/MetricCard';
import { AnimatedCounter } from '../../components/shared/AnimatedCounter';

export function ActionPipeline() {
  const actions = useEchoStore((s) => s.actions);

  const totalSavings = actions
    .filter((a) => ['APPROVED', 'EXECUTED', 'SIMULATION_PASSED', 'REQUIRE_HUMAN_APPROVAL'].includes(a.approvalState))
    .reduce((sum, a) => sum + a.projectedSavings, 0);

  const executedCount = actions.filter((a) => a.approvalState === 'EXECUTED').length;
  const pendingCount = actions.filter((a) => a.approvalState === 'REQUIRE_HUMAN_APPROVAL').length;
  const blockedCount = actions.filter((a) => a.approvalState === 'REJECTED').length;

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 4 }}>
          Action Pipeline
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Proposed, simulated, and executed optimization actions with full audit trail
        </p>
      </div>

      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        <MetricCard
          label="Pipeline Savings"
          value={<>$<AnimatedCounter value={totalSavings / 1000} decimals={1} suffix="K/mo" /></>}
          accent="var(--color-accent-green)"
          icon="💰"
        />
        <MetricCard
          label="Executed"
          value={<AnimatedCounter value={executedCount} />}
          accent="var(--color-accent-blue)"
          icon="✓"
          subValue="actions completed"
        />
        <MetricCard
          label="Awaiting Approval"
          value={<AnimatedCounter value={pendingCount} />}
          accent={pendingCount > 0 ? 'var(--color-accent-yellow)' : 'var(--color-accent-green)'}
          icon="⏳"
          subValue="human review required"
        />
        <MetricCard
          label="Blocked"
          value={<AnimatedCounter value={blockedCount} />}
          accent="var(--color-accent-red)"
          icon="⊘"
          subValue="rejected or failed"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <ActionTable />
        <RollbackHistory />
      </div>
    </div>
  );
}
