import { useState } from 'react';
import { useEchoStore } from '../../store';
import type { ModelPerformance } from '../../types';

type SortKey = keyof ModelPerformance;

const TIER_COLORS: Record<string, string> = {
  FAST: 'var(--color-accent-green)',
  MEDIUM: 'var(--color-accent-yellow)',
  DEEP: 'var(--color-accent-purple)',
};

const TIER_BG: Record<string, string> = {
  FAST: 'rgba(52,208,88,0.1)',
  MEDIUM: 'rgba(240,180,41,0.1)',
  DEEP: 'rgba(167,139,250,0.1)',
};

function AccuracyCell({ value }: { value: number }) {
  const color =
    value >= 90 ? 'var(--color-accent-green)' :
    value >= 70 ? 'var(--color-accent-yellow)' :
    'var(--color-accent-red)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Mini bar */}
      <div style={{
        width: 40,
        height: 3,
        background: 'var(--color-border)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          width: `${value}%`,
          height: '100%',
          background: color,
          borderRadius: 'var(--radius-full)',
          boxShadow: `0 0 4px ${color}80`,
        }} />
      </div>
      <span style={{ color, fontWeight: 700, fontSize: 12, letterSpacing: '-0.01em' }}>
        {value.toFixed(1)}%
      </span>
    </div>
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

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span style={{
      marginLeft: 4,
      fontSize: 9,
      opacity: sortKey === k ? 1 : 0.3,
      color: sortKey === k ? 'var(--color-accent-blue)' : undefined,
    }}>
      {sortKey === k ? (sortAsc ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="section-title">Model Performance</div>
          <div className="section-subtitle">AI provider benchmarks across reasoning tiers</div>
        </div>
        <div style={{
          fontSize: 10,
          color: 'var(--color-text-muted)',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}>
          {sorted.length} models
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
                <td>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {model.provider}
                  </span>
                </td>
                <td>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-accent-blue)',
                    background: 'var(--color-accent-blue-subtle)',
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-md)',
                    letterSpacing: '0.01em',
                  }}>
                    {model.model}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-full)',
                      background: TIER_BG[model.tier],
                      color: TIER_COLORS[model.tier],
                      fontSize: 9,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      border: `1px solid ${TIER_COLORS[model.tier]}30`,
                    }}
                  >
                    {model.tier}
                  </span>
                </td>
                <td>
                  <span style={{
                    color: model.latencyMs < 1000 ? 'var(--color-accent-green)' : 'var(--color-text-secondary)',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                  }}>
                    {model.latencyMs >= 1000
                      ? `${(model.latencyMs / 1000).toFixed(1)}s`
                      : `${model.latencyMs}ms`}
                  </span>
                </td>
                <td>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-text-secondary)',
                  }}>
                    ${model.costPerToken.toFixed(6)}
                  </span>
                </td>
                <td><AccuracyCell value={model.accuracyPct} /></td>
                <td>
                  <span style={{
                    color: 'var(--color-text-primary)',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                  }}>
                    {model.requestsToday.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
