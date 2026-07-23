import {
  Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList, CartesianGrid,
} from 'recharts';
import { calcCategoryBreakdown, calcMonthlyTrend, calcPaymentBreakdown, formatKRW } from '../utils';
import { PURPLE_GRADIENT, EXPENSE_PINK, INCOME_GREEN, CATEGORY_EMOJI } from '../constants';

// 순위(정렬 후 인덱스) 기반 보라 그라데이션 — 1등이 가장 진하고 아래로 갈수록 연해짐
const rankColor = (i) => PURPLE_GRADIENT[i % PURPLE_GRADIENT.length];

// 카테고리 이름 + 이모지, 진한 검정 굵은 글씨로 — 한눈에 잘 보이도록
const CategoryTick = ({ x, y, payload }) => {
  const emoji = CATEGORY_EMOJI[payload.value] || '';
  return (
    <g transform={`translate(${x},${y})`}>
      <text dx={-4} dy={10} textAnchor="end" transform="rotate(-35)" fontSize={11} fontWeight={700} fill="#1F2937">
        {emoji ? `${emoji} ${payload.value}` : payload.value}
      </text>
    </g>
  );
};

// 월별 추이 차트: 각 월 그룹 "사이"(경계)에 세로선을 그리기 위한 좌표 계산.
// 기본 CartesianGrid는 카테고리 중앙에 선을 그려서 구분 효과가 없었던 문제를 해결.
const monthBoundaryLines = ({ xAxis }) => {
  try {
    const { scale } = xAxis;
    const domain = scale.domain();
    if (!scale.bandwidth || domain.length < 2) return [];
    const bw = scale.bandwidth();
    const step = scale.step ? scale.step() : bw;
    const pad = (step - bw) / 2;
    return domain.slice(0, -1).map((d) => scale(d) + bw + pad);
  } catch {
    return [];
  }
};

function CategoryBarChart({ data, title, onCategoryClick }) {
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
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: -8, marginBottom: 8 }}>막대를 클릭하면 거래내역에서 바로 필터링돼요</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 24, right: 8, left: -20, bottom: 50 }}>
          <XAxis
            dataKey="name"
            tick={<CategoryTick />}
            tickLine={false}
            axisLine={false}
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
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            cursor={onCategoryClick ? 'pointer' : undefined}
            onClick={(entry) => onCategoryClick && onCategoryClick(entry?.name)}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={rankColor(i)} />
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
      <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={11} fill="#2E8F5E" fontWeight={700}>
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
        <text x={x + width / 2} y={y - 16} textAnchor="middle" fontSize={11} fill="#C2568C" fontWeight={700}>
          {(value / 10000).toFixed(0)}만
        </text>
        {sub ? (
          <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={10} fill={over ? '#C77D9B' : '#C2568C'}>
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
        <text x={x + width / 2} y={y - 16} textAnchor="middle" fontSize={11} fill="#6D5FD0" fontWeight={700}>
          {(value / 10000).toFixed(0)}만
        </text>
        <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={10} fill="#6D5FD0">
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
          <CartesianGrid
            vertical horizontal={false} stroke="#D1D5DB" strokeWidth={1}
            verticalCoordinatesGenerator={monthBoundaryLines}
          />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(val, name) => [formatKRW(val), name]}
            contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} verticalAlign="top" height={32} />
          <Bar dataKey="수입" fill={INCOME_GREEN} radius={[4, 4, 0, 0]} maxBarSize={28}>
            <LabelList content={incomeLabel} />
          </Bar>
          <Bar dataKey="지출" fill={EXPENSE_PINK} radius={[4, 4, 0, 0]} maxBarSize={28}>
            <LabelList content={expenseLabel} />
          </Bar>
          <Bar dataKey="저축" fill="#7C6FE8" radius={[4, 4, 0, 0]} maxBarSize={28}>
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
        {data.map((d, i) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          const color = rankColor(i);
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

export default function Charts({ monthTx, allTx, onCategoryClick }) {
  const yongdonData = calcCategoryBreakdown(monthTx.filter(t => t.source === '용돈'), 'expense').filter(d => d.value > 0);
  const gonggwamData = calcCategoryBreakdown(monthTx.filter(t => t.source === '공과금'), 'expense').filter(d => d.value > 0);

  return (
    <>
      <div className="grid-2">
        <CategoryBarChart data={yongdonData} title="💸 용돈 카테고리별" onCategoryClick={onCategoryClick} />
        <CategoryBarChart data={gonggwamData} title="🏛️ 공과금 카테고리별" onCategoryClick={onCategoryClick} />
      </div>
      <PaymentBarChart transactions={monthTx} />
      <MonthlyTrendChart transactions={allTx} />
    </>
  );
}
