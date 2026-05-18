import { formatKRW } from '../utils';
import { ALLOWANCE } from '../constants';

export default function SummaryCards({ stats }) {
  const cards = [
    {
      icon: '＋',
      iconBg: '#ECFDF5',
      label: '이번 달 수입',
      amount: formatKRW(stats.income),
      amountColor: '#10B981',
      sub: `급여 ${formatKRW(stats.급여)} + 정산 ${formatKRW(stats.정산수입)}`,
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
      icon: '↗',
      iconBg: '#EFF6FF',
      label: '용돈 잔액',
      amount: formatKRW(Math.max(stats.용돈잔액, 0)),
      amountColor: stats.용돈잔액 < 0 ? '#E06666' : '#2563EB',
      sub: `${ALLOWANCE.toLocaleString()}원 중 사용 ${formatKRW(stats.용돈지출)}`,
      badge: null,
    },
    {
      icon: '＝',
      iconBg: '#F5F3FF',
      label: '복지포인트 사용',
      amount: formatKRW(stats.복지포인트지출),
      amountColor: '#8E7CC3',
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
