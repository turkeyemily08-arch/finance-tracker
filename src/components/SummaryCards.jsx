import { formatKRW } from '../utils';

export default function SummaryCards({ stats }) {
  const saving = stats.income - stats.expense;
  const savingRate = stats.income > 0 ? Math.max(0, Math.round((saving / stats.income) * 100)) : 0;
  const isPositive = saving >= 0;

  const cards = [
    {
      icon: '＋',
      iconBg: '#F0FBF6',
      label: '이번 달 수입',
      amount: formatKRW(stats.income),
      amountColor: '#2A9870',
      sub: `급여 ${formatKRW(stats.급여)}`,
      badge: null,
    },
    {
      icon: '－',
      iconBg: '#FEF4F4',
      label: '이번 달 지출',
      amount: formatKRW(stats.expense),
      amountColor: '#D86060',
      sub: null,
      badge: stats.미정산 > 0 ? `미정산 ${formatKRW(stats.미정산)}` : null,
      badgeBg: '#FEF3C7',
      badgeColor: '#C8963A',
    },
    {
      icon: isPositive ? '↗' : '↘',
      iconBg: isPositive ? '#F0F5FC' : '#FEF4F4',
      label: '이번 달 저축',
      amount: isPositive ? formatKRW(saving) : `−${formatKRW(-saving)}`,
      amountColor: isPositive ? '#5FA8D6' : '#D86060',
      sub: stats.income > 0 ? `저축률 ${savingRate}%` : null,
      badge: null,
    },
    {
      icon: '＝',
      iconBg: '#F4F0FC',
      label: '복지포인트 사용',
      amount: formatKRW(stats.복지포인트지출),
      amountColor: '#9070CC',
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
