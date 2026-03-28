import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useEchoStore } from '../../store';
import { AnimatedCounter } from '../../components/shared/AnimatedCounter';

const REGION_COLORS = ['#34d058', '#4fa3f7', '#a78bfa', '#f0b429', '#f87b2b'];

export function CarbonSavingsSummary() {
  const carbonSummary = useEchoStore((s) => s.carbonSummary);

  if (!carbonSummary) return null;

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(160deg, #0a1a10 0%, #0e1820 100%)',
        border: '1px solid rgba(52,208,88,0.18)',
        boxShadow: 'var(--shadow-card), 0 0 30px rgba(52,208,88,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        background: 'radial-gradient(circle, rgba(52,208,88,0.1) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div className="section-header">
        <div>
          <div className="section-title" style={{ color: 'var(--color-text-primary)' }}>Carbon Savings</div>
          <div className="section-subtitle">CO₂e avoided this month</div>
        </div>
        <span
          style={{
            fontSize: 9,
            color: 'var(--color-accent-green)',
            fontWeight: 800,
            background: 'rgba(52,208,88,0.1)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            border: '1px solid rgba(52,208,88,0.25)',
          }}
        >
          ↑ {carbonSummary.trend}% vs last month
        </span>
      </div>

      {/* Big number */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)', position: 'relative' }}>
        <div
          style={{
            fontSize: 'var(--font-size-4xl)',
            fontWeight: 800,
            color: 'var(--color-accent-green)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            textShadow: '0 0 30px rgba(52,208,88,0.5)',
          }}
        >
          <AnimatedCounter value={carbonSummary.monthlySavingsKgCo2e} />
        </div>
        <div style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          marginTop: 5,
          fontWeight: 500,
        }}>
          kg CO₂e saved
        </div>
        <div style={{
          fontSize: 10,
          color: 'var(--color-text-muted)',
          marginTop: 2,
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}>
          {carbonSummary.workloadCategory}
        </div>
      </div>

      {/* Bar chart by region */}
      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={carbonSummary.byRegion} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="region"
            tick={{ fontSize: 9, fill: 'var(--color-text-muted)', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
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
            formatter={(v: number) => [`${v} kg CO₂e`, 'Saved']}
            labelStyle={{ color: 'var(--color-text-secondary)' }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey="savingsKgCo2e" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {carbonSummary.byRegion.map((_, idx) => (
              <Cell
                key={idx}
                fill={REGION_COLORS[idx % REGION_COLORS.length]}
                fillOpacity={0.9}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
