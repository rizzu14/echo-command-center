import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useEchoStore } from '../../store';

const AGENT_COLORS: Record<string, string> = {
  'Auditor': '#58a6ff',
  'Governor': '#3fb950',
  'Green Architect': '#bc8cff',
  'Finance': '#d29922',
};

function generateChartData() {
  const days = 7;
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now - (days - 1 - i) * 24 * 60 * 60 * 1000);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Auditor: parseFloat((92 + Math.random() * 5).toFixed(1)),
      Governor: parseFloat((95 + Math.random() * 3).toFixed(1)),
      'Green Architect': parseFloat((89 + Math.random() * 6).toFixed(1)),
      Finance: parseFloat((94 + Math.random() * 4).toFixed(1)),
    };
  });
}

const chartData = generateChartData();

export function ReasoningAccuracyChart() {
  const agents = useEchoStore((s) => s.agents);

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="section-title">Reasoning Accuracy</div>
          <div className="section-subtitle">7-day accuracy trend per agent</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[85, 100]}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              fontSize: 11,
              color: 'var(--color-text-primary)',
            }}
            formatter={(v: number, name: string) => [`${v}%`, name]}
            labelStyle={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
          />
          {Object.entries(AGENT_COLORS).map(([name, color]) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Current accuracy pills */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
        {agents.map((agent) => {
          const shortName = agent.name.replace(' Agent', '').replace('Green ', 'Green ');
          const color = Object.entries(AGENT_COLORS).find(([k]) =>
            agent.name.includes(k) || k.includes(agent.name.split(' ')[0])
          )?.[1] ?? '#8b949e';

          return (
            <div
              key={agent.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${color}33`,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{shortName}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>{agent.reasoningAccuracy}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
