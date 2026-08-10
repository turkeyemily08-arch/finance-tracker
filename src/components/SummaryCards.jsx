import { formatKRW } from '../utils';

export default function SummaryCards({ stats, welfareBalance }) {
  // 실제 저축 이체액(적금 등)을 그대로 보여줌 — 예전엔 수입-지출(잔여금)로 계산했는데,
  // 저축 이체가 지출에서 빠지게 되면서 잔여금과 실제 저축액이 달라져 헷갈릴 수 있어 분리함.
  const saving = stats.저축지출 || 0;
  const isSurplus = saving >= 0;

  const cards = [
    {
      icon: '＋',
      iconBg: '#E7F6EE',
      label: '이번 달 수입',
      amount: formatKRW(stats.income),
      amountColor: '#3DB97A',
      sub: `급여 ${formatKRW(stats.급여)}`,
      badge: null,
    },
    {
      icon: '－',
      iconBg: '#FAEEF3',
      label: '이번 달 지출',
      amount: formatKRW(stats.expense),
      amountColor: '#E0754A',
      sub: null,
      badge: stats.미정산 > 0 ? `미정산 ${formatKRW(stats.미정산)}` : null,
      badgeBg: '#FAEEF3',
      badgeColor: '#E0754A',
    },
    {
      icon: isSurplus ? '↗' : '↘',
      iconBg: isSurplus ? '#EEEBFA' : '#F7EEF3',
      label: '이번 달 저축',
      amount: isSurplus ? formatKRW(saving) : `−${formatKRW(-saving)}`,
      amountColor: isSurplus ? '#8261A8' : '#B94A34',
      sub: stats.income > 0
        ? `저축률 ${Math.max(0, Math.round((saving / stats.income) * 100))}%`
        : null,
      badge: null,
    },
    {
      icon: '✦',
      iconBg: '#F1EFFB',
      label: '복지포인트 잔액',
      amount: formatKRW(welfareBalance || 0),
      amountColor: '#A88AC7',
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
