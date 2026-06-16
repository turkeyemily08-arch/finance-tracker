import { formatKRW } from '../utils';

export default function SummaryCards({ stats, welfareBalance }) {
  const saving = stats.income - stats.expense;
  const isSurplus = saving >= 0;

  const cards = [
    {
      icon: '＋',
      iconBg: '#ECFDF5',
      label: '이번 달 수입',
      amount: formatKRW(stats.income),
      amountColor: '#10B981',
      sub: `급여 ${formatKRW(stats.급여)}`,
      badge: null,
    },
    {
      icon: '－',
      iconBg: '#FEF2F2',
      label: '이번 달 지출',
      amount: formatKRW(stats.expense),
      amountColor: '#E06666',
      sub: null,
      badge: stats.미정산 > 0 ? `미정산 ${formatKRW(stats.미정산)}` : null,
      badgeBg: '#FEF3C7',
      badgeColor: '#D97706',
    },
    {
      icon: isSurplus ? '↗' : '↘',
      iconBg: isSurplus ? '#EFF6FF' : '#FEF2F2',
      label: '이번 달 저축',
      amount: isSurplus ? formatKRW(saving) : `−${formatKRW(-saving)}`,
      amountColor: isSurplus ? '#2563EB' : '#E06666',
      sub: stats.income > 0
        ? `저축률 ${Math.max(0, Math.round((saving / stats.income) * 100))}%`
        : null,
      badge: null,
    },
    {
      icon: '✦',
      iconBg: '#F5F3FF',
      label: '복지포인트 잔액',
      amount: formatKRW(welfareBalance || 0),
      amountColor: '#8E7CC3',
      sub: '사용 가능',
      badge: null,
    },
  ];

  return (
    <div className="grid-4">
      {cards.map((c, i) => (
        <div className="summary-card" key={i}>
          <div className="icon-box" style={{ background: c.iconBg, color: c.amountColor }}>
            {c.icon}
          </div>
          <div className="label">{c.label}</div>
          <div className="amount" style={{ color: c.amountColor }}>{c.amount}</div>
          {c.sub && <div className="sub">{c.sub}</div>}
          {c.badge && (
            <span className="badge" style={{ background: c.badgeBg, color: c.badgeColor }}>
              {c.badge}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
