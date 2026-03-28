import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useEchoStore } from '../../store';
import { AnimatedCounter } from '../../components/shared/AnimatedCounter';

export function ROISummaryCard() {
  const roiSummary = useEchoStore((s) => s.roiSummary);

  if (!roiSummary) return null;

  return (
    <div
      className="card card-premium"
      style={{
        background: 'linear-gradient(135deg, #0e1824 0%, #0b1a2e 60%, #0e1f1a 100%)',
        border: '1px solid rgba(79, 163, 247, 0.2)',
        gridColumn: 'span 2',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card), 0 0 40px rgba(52,208,88,0.08), 0 0 80px rgba(79,163,247,0.05)',
      }}
    >
      {/* Background glow orbs */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -40,
          width: 260,
          height: 260,
          background: 'radial-gradient(circle, rgba(52, 208, 88, 0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -60,
          left: -40,
          width: 200,
          height: 200,
          background: 'radial-gradient(circle, rgba(79, 163, 247, 0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top shimmer line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(52,208,88,0.5), rgba(79,163,247,0.4), transparent)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative' }}>
        {/* Main metric */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
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
              letterSpacing: '-0.04em',
              textShadow: '0 0 40px rgba(52,208,88,0.5)',
            }}
          >
            $<AnimatedCounter value={roiSummary.totalSavingsUsd / 1_000_000} decimals={1} suffix="M" />
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(255,255,255,0.05)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-md)',
              display: 'inline-block',
              marginTop: 'var(--space-2)',
              border: '1px solid var(--color-border)',
              letterSpacing: '0.01em',
            }}
          >
            ROI = (Savings − Costs) / Platform Cost × 100
          </div>
        </div>

        {/* Secondary metrics */}
        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {[
            {
              label: 'ROI',
              value: <><AnimatedCounter value={roiSummary.cumulativeRoi} suffix="%" /></>,
              color: 'var(--color-accent-blue)',
              glow: 'rgba(79,163,247,0.3)',
            },
            {
              label: 'Annual Projection',
              value: <>$<AnimatedCounter value={roiSummary.projectedAnnualSavings / 1_000_000} decimals={1} suffix="M" /></>,
              color: 'var(--color-text-primary)',
              glow: undefined,
            },
            {
              label: 'Cost / Insight',
              value: <>$<AnimatedCounter value={roiSummary.costPerInsight} decimals={2} /></>,
              color: 'var(--color-text-primary)',
              glow: undefined,
            },
          ].map((metric) => (
            <div key={metric.label}>
              <div style={{
                fontSize: 9,
                color: 'var(--color-text-muted)',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 5,
              }}>
                {metric.label}
              </div>
              <div style={{
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 800,
                color: metric.color,
                letterSpacing: '-0.03em',
                textShadow: metric.glow ? `0 0 20px ${metric.glow}` : undefined,
              }}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>

        {/* Sparkline */}
        <div style={{ minWidth: 180 }}>
          <div style={{
            fontSize: 9,
            color: 'var(--color-text-muted)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 6,
          }}>
            30-Day Trend
          </div>
          <ResponsiveContainer width="100%" height={64}>
            <AreaChart data={roiSummary.sparklineData}>
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d058" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#34d058" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#34d058"
                strokeWidth={2}
                fill="url(#savingsGradient)"
                dot={false}
                strokeLinecap="round"
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border-emphasis)',
                  borderRadius: 8,
                  fontSize: 11,
                  color: 'var(--color-text-primary)',
                  boxShadow: 'var(--shadow-lg)',
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
