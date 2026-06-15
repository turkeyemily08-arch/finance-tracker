import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as BarTooltip, Legend, LabelList,
} from 'recharts';
import { calcCategoryBreakdown, calcMonthlyTrend, calcPaymentMethodBreakdown, formatKRW } from '../utils';
import { CATEGORY_COLORS, PAYMENT_METHOD_COLORS } from '../constants';

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

function DonutChart({ data, title, colorMap = CATEGORY_COLORS }) {
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
              <Cell key={i} fill={colorMap[entry.name] || '#CBD5E1'} />
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
            <div className="legend-dot" style={{ background: colorMap[entry.name] || '#CBD5E1' }} />
            {entry.name}
          </div>
        ))}
      </div>
    </div>
  );
}

const renderBarLabel = (props) => {
  const { x, y, width, value } = props;
  if (!value || value < 50000) return null;
  return (
    <text x={x + width / 2} y={y - 4} fill="#6B7280" fontSize={9} textAnchor="middle">
      {`${Math.round(value / 10000)}만`}
    </text>
  );
};

function MonthlyTrendChart({ transactions }) {
  const data = calcMonthlyTrend(transactions);
  return (
    <div className="chart-card">
      <div className="chart-title">월별 수입/지출 추이</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => `${(v/10000).toFixed(0)}만`} tickLine={false} axisLine={false} />
          <BarTooltip
            formatter={(val, name) => [formatKRW(val), name]}
            contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="수입" fill="#B0D8B8" radius={[4,4,0,0]} maxBarSize={30}>
            <LabelList content={renderBarLabel} />
          </Bar>
          <Bar dataKey="지출" fill="#F0ACAC" radius={[4,4,0,0]} maxBarSize={30}>
            <LabelList content={renderBarLabel} />
          </Bar>
          <Bar dataKey="저축" fill="#B0BCE8" radius={[4,4,0,0]} maxBarSize={30}>
            <LabelList content={renderBarLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Charts({ monthTx, allTx }) {
  const expenseData = calcCategoryBreakdown(monthTx, 'expense').filter(d => d.value > 0);
  const paymentData = calcPaymentMethodBreakdown(monthTx).filter(d => d.value > 0);

  return (
    <>
      <div className="grid-2">
        <DonutChart data={expenseData} title="지출 카테고리별 비율" colorMap={CATEGORY_COLORS} />
        <DonutChart data={paymentData} title="결제수단별 지출" colorMap={PAYMENT_METHOD_COLORS} />
      </div>
      <MonthlyTrendChart transactions={allTx} />
    </>
  );
}
