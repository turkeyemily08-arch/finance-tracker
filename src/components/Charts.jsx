import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as BarTooltip, Legend,
} from 'recharts';
import { calcCategoryBreakdown, calcMonthlyTrend, formatKRW } from '../utils';
import { CATEGORY_COLORS } from '../constants';

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  return (
    <text
      x={cx + r * Math.cos(-midAngle * RADIAN)}
      y={cy + r * Math.sin(-midAngle * RADIAN)}
      fill="#fff" fontSize={10} textAnchor="middle" dominantBaseline="central"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function DonutChart({ data, title }) {
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%"
            innerRadius={55} outerRadius={85}
            labelLine={false} label={renderCustomLabel}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#CBD5E1'} />
            ))}
          </Pie>
          <PieTooltip
            formatter={(val, name) => [formatKRW(val), name]}
            contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="legend">
        {data.map((entry, i) => (
          <div className="legend-item" key={i}>
            <div className="legend-dot" style={{ background: CATEGORY_COLORS[entry.name] || '#CBD5E1' }} />
            {entry.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyTrendChart({ transactions }) {
  const data = calcMonthlyTrend(transactions);
  return (
    <div className="chart-card">
      <div className="chart-title">월별 수입/지출 추이</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => `${(v/10000).toFixed(0)}만`} tickLine={false} axisLine={false} />
          <BarTooltip
            formatter={(val, name) => [formatKRW(val), name]}
            contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="수입" fill="#10B981" radius={[4,4,0,0]} maxBarSize={30} />
          <Bar dataKey="지출" fill="#E06666" radius={[4,4,0,0]} maxBarSize={30} />
          <Bar dataKey="저축" fill="#FFB400" radius={[4,4,0,0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Charts({ monthTx, allTx }) {
  const expenseData = calcCategoryBreakdown(monthTx, 'expense').filter(d => d.value > 0);
  const incomeData = calcCategoryBreakdown(monthTx, 'income').filter(d => d.value > 0);

  return (
    <>
      <div className="grid-2">
        <DonutChart data={expenseData} title="지출 카테고리별 비율" />
        <DonutChart data={incomeData} title="수입 카테고리별 비율" />
      </div>
      <MonthlyTrendChart transactions={allTx} />
    </>
  );
}
