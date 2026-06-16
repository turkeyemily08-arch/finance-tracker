import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatKRW, calcDailyAllowanceBalance } from '../utils';
import { ALLOWANCE } from '../constants';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#6B7280' }}>{label}</div>
      <div style={{ color: val < 0 ? '#E06666' : '#2563EB', fontWeight: 600 }}>{formatKRW(val)}</div>
    </div>
  );
};

export default function AllowancePanel({ transactions, year, month, stats }) {
  const allowanceData = calcDailyAllowanceBalance(transactions, year, month);

  const usedPct = Math.min((stats.용돈지출 / ALLOWANCE) * 100, 100);
  const barColor = usedPct > 100 ? '#E06666' : usedPct > 90 ? '#E06666' : usedPct > 70 ? '#FF9900' : '#10B981';
  const isOverBudget = stats.용돈잔액 < 0;

  return (
    <div className="allowance-panel" style={{ alignSelf: 'start' }}>
      {/* 용돈 현황 */}
      <div className="allowance-header">
        <span className="allowance-title">💰 용돈 현황</span>
        <span className="allowance-badge">월 {ALLOWANCE.toLocaleString()}원</span>
      </div>

      <div className="allowance-bar-wrap">
        <div className="allowance-bar" style={{ width: `${Math.min(usedPct, 100)}%`, background: barColor }} />
      </div>
      <div className="allowance-nums">
        <span>사용 {formatKRW(stats.용돈지출)}</span>
        <span style={{ color: isOverBudget ? '#E06666' : undefined, fontWeight: isOverBudget ? 700 : undefined }}>
          {isOverBudget
            ? `−${formatKRW(-stats.용돈잔액)} 초과`
            : `잔액 ${formatKRW(stats.용돈잔액)}`}
        </span>
      </div>

      <div className="chart-title" style={{ fontSize: 13, marginBottom: 10 }}>일별 용돈 잔액</div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={allowanceData} margin={{ top: 4, right: 8, left: -30, bottom: 0 }}>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} interval={allowanceData.length > 20 ? 4 : 2} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
            tickLine={false}
            axisLine={false}
            domain={[(dataMin) => Math.max(0, Math.floor(dataMin / 10000) * 10000 - 10000), (dataMax) => dataMax + 5000]}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine y={0} stroke="#E5E7EB" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="balance" stroke="#2563EB" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#2563EB' }} />
        </LineChart>
      </ResponsiveContainer>

    </div>
  );
}
