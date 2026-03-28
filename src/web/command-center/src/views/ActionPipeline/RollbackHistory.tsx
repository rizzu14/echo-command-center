import { useEchoStore } from '../../store';

export function RollbackHistory() {
  const actions = useEchoStore((s) => s.actions);
  const rolledBack = actions.filter((a) => a.approvalState === 'ROLLED_BACK');

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">Rollback History</div>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          {rolledBack.length} rollback{rolledBack.length !== 1 ? 's' : ''}
        </span>
      </div>

      {rolledBack.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
          No rollbacks recorded
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Action ID</th>
                <th>Type</th>
                <th>Resources</th>
                <th>Before</th>
                <th>After</th>
                <th>Savings Lost</th>
              </tr>
            </thead>
            <tbody>
              {rolledBack.map((action) => (
                <tr key={action.actionId}>
                  <td style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {action.actionId}
                  </td>
                  <td style={{ fontWeight: 600 }}>{action.type.replace(/_/g, ' ')}</td>
                  <td style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {action.targetResources[0]}
                  </td>
                  <td>
                    <span style={{ color: 'var(--color-accent-red)', fontWeight: 600 }}>
                      ${action.costMath.currentCostUsd.toFixed(2)}/hr
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--color-accent-green)', fontWeight: 600 }}>
                      ${action.costMath.optimizedCostUsd.toFixed(2)}/hr
                    </span>
                    <span style={{ color: 'var(--color-accent-orange)', marginLeft: 6, fontSize: 11 }}>
                      (reverted)
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-accent-orange)', fontWeight: 600 }}>
                    ${action.projectedSavings.toLocaleString()}/mo
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
