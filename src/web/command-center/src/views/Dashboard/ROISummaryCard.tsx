import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useEchoStore } from '../../store';
import { AnimatedCounter } from '../../components/shared/AnimatedCounter';

export function ROISummaryCard() {
  const roiSummary = useEchoStore((s) => s.roiSummary);

  if (!roiSummary) return null;

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg, #161b22 0%, #1a2332 100%)',
        border: '1px solid rgba(88, 166, 255, 0.2)',
        gridColumn: 'span 2',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          background: 'radial-gradient(circle, rgba(63, 185, 80, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Main metric */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 'var(--space-2)',
            }}
          >
            Total Savings Realized
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-5xl)',
              fontWeight: 800,
              color: 'var(--color-accent-green)',
              lineHeight: 1,
              marginBottom: 'var(--space-2)',
            }}
          >
            $<AnimatedCounter value={roiSummary.totalSavingsUsd / 1_000_000} decimals={1} suffix="M" />
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'SF Mono, Fira Code, monospace',
              background: 'var(--color-surface)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-md)',
              display: 'inline-block',
              marginTop: 'var(--space-2)',
            }}
          >
            ROI = (Savings − Costs) / Platform Cost × 100
          </div>
        </div>

        {/* Secondary metrics */}
        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              ROI
            </div>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--color-accent-blue)' }}>
              <AnimatedCounter value={roiSummary.cumulativeRoi} suffix="%" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Annual Projection
            </div>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              $<AnimatedCounter value={roiSummary.projectedAnnualSavings / 1_000_000} decimals={1} suffix="M" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Cost / Insight
            </div>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              $<AnimatedCounter value={roiSummary.costPerInsight} decimals={2} />
            </div>
          </div>
        </div>

        {/* Sparkline */}
        <div style={{ width: 200, height: 80 }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            30-Day Trend
          </div>
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart data={roiSummary.sparklineData}>
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3fb950"
                strokeWidth={2}
                fill="url(#savingsGradient)"
                dot={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  fontSize: 11,
                  color: 'var(--color-text-primary)',
                }}
                formatter={(v: number) => [`$${(v / 1000).toFixed(0)}K`, 'Savings']}
                labelStyle={{ color: 'var(--color-text-secondary)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
