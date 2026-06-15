import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatKRW, calcDailyAllowanceBalance, calcPrevMonthAllowanceBalance } from '../utils';
import { ALLOWANCE } from '../constants';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#6B7280', marginBottom: 4 }}>{label}</div>
      {payload.map((p) => p.value != null && (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.dataKey === 'balance' ? '이번달' : '전달'}: {formatKRW(p.value)}
        </div>
      ))}
    </div>
  );
};

export default function AllowancePanel({ transactions, year, month, stats }) {
  const current = calcDailyAllowanceBalance(transactions, year, month);
  const prev = calcPrevMonthAllowanceBalance(transactions, year, month);

  const data = current.map((d, i) => ({
    ...d,
    prevBalance: prev[i]?.balance ?? null,
  }));

  const usedPct = Math.min((stats.용돈지출 / ALLOWANCE) * 100, 100);
  const barColor = usedPct > 90 ? '#F088AC' : usedPct > 70 ? '#F0B060' : '#5FC0A0';
  const isNegative = stats.용돈잔액 < 0;

  return (
    <div className="allowance-panel">
      <div className="allowance-header">
        <span className="allowance-title">💰 용돈 현황</span>
        <span className="allowance-badge">월 {ALLOWANCE.toLocaleString()}원</span>
      </div>

      <div className="allowance-bar-wrap">
        <div className="allowance-bar" style={{ width: `${Math.min(usedPct, 100)}%`, background: barColor }} />
      </div>
      <div className="allowance-nums">
        <span>사용 {formatKRW(stats.용돈지출)}</span>
        <span style={{ color: isNegative ? '#E0708C' : undefined }}>
          {isNegative
            ? `마이너스 ${formatKRW(-stats.용돈잔액)}`
            : `잔액 ${formatKRW(stats.용돈잔액)}`}
        </span>
      </div>

      <div className="chart-title" style={{ fontSize: 14, marginBottom: 4 }}>
        일별 용돈 잔액
        <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 400, marginLeft: 8 }}>
          <span style={{ color: '#6FB0E0' }}>──</span> 이번달 &nbsp;
          <span style={{ color: '#C0C0C0' }}>- - 전달</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -30, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            interval={data.length > 20 ? 4 : 2}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#E5E7EB" strokeDasharray="3 3" />
          <Line
            type="monotone" dataKey="prevBalance" stroke="#D0D0D0"
            strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls
          />
          <Line
            type="monotone" dataKey="balance" stroke="#5FA8D6"
            strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#5FA8D6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
