import { generateAdvice, calcNextMonthPrediction, formatKRW } from '../utils';

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
        <div key={i} className="advice-item" style={{ borderLeftColor: item.color }}>
          {item.icon} {item.text}
        </div>
      ))}
    </div>
  );
}

export function NextMonthCard({ allTransactions, year, month }) {
  const pred = calcNextMonthPrediction(allTransactions);

  // 다음 달 계산
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  if (!pred) {
    return (
      <div className="advice-card">
        <div className="advice-header">
          <div className="advice-title">
            <span style={{ color: '#8E7CC3' }}>◈</span> 다음 달 예측
          </div>
          <div className="advice-date">{nextYear}년 {nextMonth}월</div>
        </div>
        <div className="advice-item" style={{ borderLeftColor: '#E5E7EB', color: '#9CA3AF' }}>
          데이터가 부족해 예측이 어렵습니다.
        </div>
      </div>
    );
  }

  const savingRate = pred.income > 0 ? Math.round((pred.saving / pred.income) * 100) : 0;
  const isDeficit = pred.deficit > 0;

  const items = [
    {
      icon: '💵',
      color: '#10B981',
      text: `예상 수입 ${formatKRW(pred.income)} — 최근 월 급여 기준`,
    },
    {
      icon: '💸',
      color: isDeficit ? '#E06666' : '#F87171',
      text: `예상 지출 ${formatKRW(pred.expense)} — 최근 ${pred.monthsUsed}개월 평균`,
    },
    isDeficit
      ? {
          icon: '⚠️',
          color: '#E06666',
          text: `예상 적자 ${formatKRW(pred.deficit)} — 지출 패턴 점검이 필요해요`,
        }
      : {
          icon: savingRate >= 30 ? '🎯' : '💡',
          color: savingRate >= 30 ? '#2563EB' : '#D97706',
          text: `예상 저축 ${formatKRW(pred.saving)} (저축률 ${savingRate}%)${savingRate < 20 ? ' — 지출 줄이기를 고려해보세요' : ' — 좋은 흐름이에요!'}`,
        },
  ];

  return (
    <div className="advice-card">
      <div className="advice-header">
        <div className="advice-title">
          <span style={{ color: '#8E7CC3' }}>◈</span> 다음 달 예측
        </div>
        <div className="advice-date">{nextYear}년 {nextMonth}월</div>
      </div>
      {items.map((item, i) => (
        <div key={i} className="advice-item" style={{ borderLeftColor: item.color }}>
          {item.icon} {item.text}
        </div>
      ))}
      <div style={{
        marginTop: 10, padding: '8px 12px', background: '#F8F7FF',
        borderRadius: 8, fontSize: 11, color: '#8E7CC3', lineHeight: 1.5,
      }}>
        * 예측은 실제와 다를 수 있어요. 정산·보너스 등 비정기 수입은 반영되지 않습니다.
      </div>
    </div>
  );
}
