import {
  Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList,
} from 'recharts';
import { calcCategoryBreakdown, calcMonthlyTrend, calcPaymentBreakdown, formatKRW } from '../utils';
import { CATEGORY_COLORS, PAYMENT_METHOD_COLORS } from '../constants';

function CategoryBarChart({ data, title }) {
  const sum = data.reduce((s, d) => s + d.value, 0);
  const titleWithSum = (
    <div className="chart-title" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <span>{title}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>합계 {sum.toLocaleString()}원</span>
    </div>
  );

  if (!data.length) {
    return (
      <div className="chart-card">
        {titleWithSum}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#9CA3AF', fontSize: 13 }}>이번 달 지출 없음</div>
      </div>
    );
  }

  const renderBarLabel = ({ x, y, width, value }) => {
    if (!value || value < 3000) return null;
    return (
      <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={11} fill="#374151" fontWeight={600}>
        {value >= 10000 ? `${(value / 10000).toFixed(1)}만` : `${value.toLocaleString()}`}
      </text>
    );
  };

  return (
    <div className="chart-card">
      {titleWithSum}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 24, right: 8, left: -20, bottom: 50 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#374151' }}
            tickLine={false}
            axisLine={false}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(val) => [formatKRW(val), '금액']}
            contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((entry, i) => (
              <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#CBD5E1'} />
            ))}
            <LabelList content={renderBarLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthlyTrendChart({ transactions }) {
  const data = calcMonthlyTrend(transactions);

  const incomeLabel = ({ x, y, width, value }) => {
    if (!value || value < 10000) return null;
    return (
      <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={11} fill="#059669" fontWeight={700}>
        {(value / 10000).toFixed(0)}만
      </text>
    );
  };

  const expenseLabel = ({ x, y, width, value, index }) => {
    if (!value) return null;
    const entry = data[index];
    const over = entry?.수입 > 0 && value > entry.수입;
    const pct = entry?.수입 > 0 ? Math.round((value / entry.수입) * 100) : 0;
    const sub = over ? '⚠️초과' : entry?.수입 > 0 ? `${pct}%` : '';
    return (
      <g>
        <text x={x + width / 2} y={y - 16} textAnchor="middle" fontSize={11} fill="#DC2626" fontWeight={700}>
          {(value / 10000).toFixed(0)}만
        </text>
        {sub ? (
          <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={10} fill={over ? '#E06666' : '#DC2626'}>
            {sub}
          </text>
        ) : null}
      </g>
    );
  };

  const savingLabel = ({ x, y, width, value, index }) => {
    const entry = data[index];
    const over = entry && entry.지출 > entry.수입;
    // 지출 초과인 달은 저축바가 0이므로 레이블 숨김
    if (over || !value) return null;
    const pct = entry?.수입 > 0 ? Math.round((value / entry.수입) * 100) : 0;
    return (
      <g>
        <text x={x + width / 2} y={y - 16} textAnchor="middle" fontSize={11} fill="#4F46E5" fontWeight={700}>
          {(value / 10000).toFixed(0)}만
        </text>
        <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={10} fill="#4F46E5">
          {pct}%
        </text>
      </g>
    );
  };

  return (
    <div className="chart-card">
      <div className="chart-title">📊 월별 수입/지출 추이</div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 38, right: 8, left: -20, bottom: 8 }}>
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(val, name) => [formatKRW(val), name]}
            contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} verticalAlign="top" height={32} />
          <Bar dataKey="수입" fill="#34D399" radius={[4, 4, 0, 0]} maxBarSize={28}>
            <LabelList content={incomeLabel} />
          </Bar>
          <Bar dataKey="지출" fill="#F87171" radius={[4, 4, 0, 0]} maxBarSize={28}>
            <LabelList content={expenseLabel} />
          </Bar>
          <Bar dataKey="저축" fill="#818CF8" radius={[4, 4, 0, 0]} maxBarSize={28}>
            <LabelList content={savingLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PaymentBarChart({ transactions }) {
  const data = calcPaymentBreakdown(transactions);
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="chart-card">
      <div className="chart-title">💳 결제수단별 지출</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {data.map((d) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          const color = PAYMENT_METHOD_COLORS[d.name] || '#BDBDBD';
          return (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 64, fontSize: 12, color: '#374151', textAlign: 'right', flexShrink: 0 }}>
                {d.name}
              </div>
              <div style={{ flex: 1, background: '#F3F4F6', borderRadius: 4, height: 18, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', background: color,
                  borderRadius: 4, minWidth: pct > 0 ? 4 : 0,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ width: 72, fontSize: 12, color, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>
                {d.value.toLocaleString()}원
              </div>
              <div style={{ width: 36, fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>
                {pct.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Charts({ monthTx, allTx }) {
  const yongdonData = calcCategoryBreakdown(monthTx.filter(t => t.source === '용돈'), 'expense').filter(d => d.value > 0);
  const gonggwamData = calcCategoryBreakdown(monthTx.filter(t => t.source === '공과금'), 'expense').filter(d => d.value > 0);

  return (
    <>
      <div className="grid-2">
        <CategoryBarChart data={yongdonData} title="💸 용돈 카테고리별" />
        <CategoryBarChart data={gonggwamData} title="🏛️ 공과금 카테고리별" />
      </div>
      <PaymentBarChart transactions={monthTx} />
      <MonthlyTrendChart transactions={allTx} />
    </>
  );
}
