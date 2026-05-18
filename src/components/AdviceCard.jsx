import { generateAdvice } from '../utils';

export default function AdviceCard({ stats, transactions, year, month }) {
  const advice = generateAdvice(stats, transactions);
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${new Date().getDate()}`;

  return (
    <div className="advice-card">
      <div className="advice-header">
        <div className="advice-title">
          <span style={{ color: '#2563EB' }}>✦</span> Claude 소비 조언
        </div>
        <div className="advice-date">{dateStr} 기준</div>
      </div>
      {advice.map((item, i) => (
        <div
          key={i} className="advice-item"
          style={{ borderLeftColor: item.color }}
        >
          {item.icon} {item.text}
        </div>
      ))}
    </div>
  );
}
