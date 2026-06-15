import { formatKRW } from '../utils';

export default function SummaryCards({ stats }) {
  const saving = stats.income - stats.expense;
  const savingRate = stats.income > 0 ? Math.max(0, Math.round((saving / stats.income) * 100)) : 0;
  const isPositive = saving >= 0;

  const cards = [
    {
      icon: '＋',
      iconBg: '#F0FAF5',
      label: '이번 달 수입',
      amount: formatKRW(stats.income),
      amountColor: '#45AE92',
      sub: `급여 ${formatKRW(stats.급여)}`,
      badge: null,
    },
    {
      icon: '－',
      iconBg: '#FDF0F4',
      label: '이번 달 지출',
      amount: formatKRW(stats.expense),
      amountColor: '#E87694',
      sub: null,
      badge: stats.미정산 > 0 ? `미정산 ${formatKRW(stats.미정산)}` : null,
      badgeBg: '#FEF3E8',
      badgeColor: '#D0904A',
    },
    {
      icon: isPositive ? '↗' : '↘',
      iconBg: isPositive ? '#EFF5FD' : '#FDF0F4',
      label: '이번 달 저축',
      amount: isPositive ? formatKRW(saving) : `−${formatKRW(-saving)}`,
      amountColor: isPositive ? '#5A98D6' : '#E87694',
      sub: stats.income > 0 ? `저축률 ${savingRate}%` : null,
      badge: null,
    },
    {
      icon: '＝',
      iconBg: '#F4F0FC',
      label: '복지포인트 사용',
      amount: formatKRW(stats.복지포인트지출),
      amountColor: '#9D72CE',
      sub: null,
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
