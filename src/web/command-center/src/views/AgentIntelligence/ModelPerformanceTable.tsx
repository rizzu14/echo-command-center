import { useState } from 'react';
import { useEchoStore } from '../../store';
import type { ModelPerformance } from '../../types';

type SortKey = keyof ModelPerformance;

const TIER_COLORS: Record<string, string> = {
  FAST: 'var(--color-accent-green)',
  MEDIUM: 'var(--color-accent-yellow)',
  DEEP: 'var(--color-accent-purple)',
};

function AccuracyCell({ value }: { value: number }) {
  const color =
    value >= 90 ? 'var(--color-accent-green)' :
    value >= 70 ? 'var(--color-accent-yellow)' :
    'var(--color-accent-red)';

  return (
    <span style={{ color, fontWeight: 700 }}>{value.toFixed(1)}%</span>
  );
}

export function ModelPerformanceTable() {
  const models = useEchoStore((s) => s.modelPerformance);
  const [sortKey, setSortKey] = useState<SortKey>('tier');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...models].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortAsc ? av - bv : bv - av;
    }
    return sortAsc
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ' ·';

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="section-title">Model Performance</div>
          <div className="section-subtitle">AI provider benchmarks across reasoning tiers</div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('provider')}>Provider<SortIcon k="provider" /></th>
              <th onClick={() => handleSort('model')}>Model<SortIcon k="model" /></th>
              <th onClick={() => handleSort('tier')}>Tier<SortIcon k="tier" /></th>
              <th onClick={() => handleSort('latencyMs')}>Latency<SortIcon k="latencyMs" /></th>
              <th onClick={() => handleSort('costPerToken')}>Cost/Token<SortIcon k="costPerToken" /></th>
              <th onClick={() => handleSort('accuracyPct')}>Accuracy<SortIcon k="accuracyPct" /></th>
              <th onClick={() => handleSort('requestsToday')}>Req Today<SortIcon k="requestsToday" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((model) => (
              <tr key={`${model.provider}-${model.model}`}>
                <td style={{ fontWeight: 600 }}>{model.provider}</td>
                <td style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 12 }}>{model.model}</td>
                <td>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: `${TIER_COLORS[model.tier]}22`,
                      color: TIER_COLORS[model.tier],
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {model.tier}
                  </span>
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  {model.latencyMs >= 1000
                    ? `${(model.latencyMs / 1000).toFixed(1)}s`
                    : `${model.latencyMs}ms`}
                </td>
                <td style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  ${model.costPerToken.toFixed(6)}
                </td>
                <td><AccuracyCell value={model.accuracyPct} /></td>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  {model.requestsToday.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
