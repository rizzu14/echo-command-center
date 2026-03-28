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
  'Auditor': '#4fa3f7',
  'Governor': '#34d058',
  'Green Architect': '#a78bfa',
  'Finance': '#f0b429',
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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {agents.map((agent) => {
            const shortName = agent.name.replace(' Agent', '').replace('Green ', 'Green ');
            const color = Object.entries(AGENT_COLORS).find(([k]) =>
              agent.name.includes(k) || k.includes(agent.name.split(' ')[0])
            )?.[1] ?? '#7e8da8';

            return (
              <div
                key={agent.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: `${color}12`,
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${color}30`,
                  cursor: 'default',
                }}
              >
                <div style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 6px ${color}80`,
                }} />
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  {shortName}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color,
                  letterSpacing: '-0.01em',
                }}>
                  {agent.reasoningAccuracy}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" opacity={0.6} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[85, 100]}
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border-emphasis)',
              borderRadius: 10,
              fontSize: 11,
              color: 'var(--color-text-primary)',
              boxShadow: 'var(--shadow-lg)',
              padding: '10px 14px',
            }}
            formatter={(v: number, name: string) => [`${v}%`, name]}
            labelStyle={{ color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 600 }}
            cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
          />
          <Legend
            wrapperStyle={{
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              paddingTop: 12,
              letterSpacing: '0.02em',
            }}
          />
          {Object.entries(AGENT_COLORS).map(([name, color]) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: 'var(--color-background-primary)' }}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
