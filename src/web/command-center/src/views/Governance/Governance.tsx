import { KillSwitchButton } from './KillSwitchButton';
import { DoWConfig } from './DoWConfig';
import { PolicyEditor } from './PolicyEditor';
import { ComplianceReport } from './ComplianceReport';

export function Governance() {
  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 4 }}>
          Governance
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Emergency controls, spend limits, policy configuration, and compliance reporting
        </p>
      </div>

      {/* Top row: Kill switch + DoW */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-4)' }}>
        <KillSwitchButton />
        <DoWConfig />
      </div>

      {/* Compliance report */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <ComplianceReport />
      </div>

      {/* Policy editor */}
      <PolicyEditor />
    </div>
  );
}
