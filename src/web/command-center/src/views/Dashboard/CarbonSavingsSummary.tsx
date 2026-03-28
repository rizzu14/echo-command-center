import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useEchoStore } from '../../store';
import { AnimatedCounter } from '../../components/shared/AnimatedCounter';

const REGION_COLORS = ['#3fb950', '#58a6ff', '#bc8cff', '#d29922', '#db6d28'];

export function CarbonSavingsSummary() {
  const carbonSummary = useEchoStore((s) => s.carbonSummary);

  if (!carbonSummary) return null;

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="section-title">Carbon Savings</div>
          <div className="section-subtitle">CO₂e avoided this month</div>
        </div>
        <span
          style={{
            fontSize: 10,
            color: 'var(--color-accent-green)',
            fontWeight: 700,
            background: 'var(--color-accent-green-subtle)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          ↑ {carbonSummary.trend}% vs last month
        </span>
      </div>

      {/* Big number */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
        <div
          style={{
            fontSize: 'var(--font-size-4xl)',
            fontWeight: 800,
            color: 'var(--color-accent-green)',
            lineHeight: 1,
          }}
        >
          <AnimatedCounter value={carbonSummary.monthlySavingsKgCo2e} />
        </div>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          kg CO₂e saved
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
          {carbonSummary.workloadCategory}
        </div>
      </div>

      {/* Bar chart by region */}
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={carbonSummary.byRegion} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="region"
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              fontSize: 11,
              color: 'var(--color-text-primary)',
            }}
            formatter={(v: number) => [`${v} kg CO₂e`, 'Saved']}
            labelStyle={{ color: 'var(--color-text-secondary)' }}
          />
          <Bar dataKey="savingsKgCo2e" radius={[3, 3, 0, 0]}>
            {carbonSummary.byRegion.map((_, idx) => (
              <Cell key={idx} fill={REGION_COLORS[idx % REGION_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
