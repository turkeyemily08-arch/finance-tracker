import { formatKRW } from '../utils';

export function CopyButtons({ transactions, stats, year, month }) {
  const settlementItems = transactions.filter(
    (t) => t.type === 'expense' && (t.memo || '').includes('정산필요')
  );

  const copySettlement = () => {
    if (!settlementItems.length) { alert('정산 필요 항목이 없습니다.'); return; }
    const byCategory = {};
    const count = {};
    settlementItems.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      count[t.category] = (count[t.category] || 0) + 1;
    });
    const total = settlementItems.reduce((s, t) => s + t.amount, 0);
    const lines = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `• ${cat} (${count[cat]}건): ${amt.toLocaleString()}원`);
    const text = `📋 ${year}년 ${month}월 정산 요청\n\n${lines.join('\n')}\n\n💰 합계: ${total.toLocaleString()}원`;
    navigator.clipboard.writeText(text).then(() => alert('복사됐어요! 이민구님께 붙여넣기 하세요 😊'));
  };

  const copyReport = () => {
    const saving = Math.max(0, stats.income - stats.expense);
    const rate = stats.income > 0 ? Math.round((saving / stats.income) * 100) : 0;
    const text = [
      `📊 ${year}년 ${month}월 가계부 리포트`,
      '',
      `💵 수입   ${stats.income.toLocaleString()}원`,
      `💸 지출   ${stats.expense.toLocaleString()}원`,
      `💰 저축   ${saving.toLocaleString()}원 (${rate}%)`,
      '',
      '재원별 지출',
      `• 공과금  ${stats.공과금지출.toLocaleString()}원${stats.미정산 > 0 ? `  (미정산 ${stats.미정산.toLocaleString()}원)` : '  ✅ 정산완료'}`,
      `• 용돈    ${stats.용돈지출.toLocaleString()}원  (잔액 ${stats.용돈잔액 >= 0 ? stats.용돈잔액.toLocaleString() : '-' + (-stats.용돈잔액).toLocaleString()}원)`,
      `• 복지    ${stats.복지포인트지출.toLocaleString()}원`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => alert('리포트가 복사됐어요!'));
  };

  const btnBase = {
    fontSize: 12, padding: '6px 12px', borderRadius: 8,
    border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={copyReport} style={{ ...btnBase, color: '#374151' }}>
        📄 월간 리포트
      </button>
      <button
        onClick={copySettlement}
        style={{
          ...btnBase,
          background: settlementItems.length > 0 ? '#FFF7ED' : '#fff',
          color: settlementItems.length > 0 ? '#EA580C' : '#9CA3AF',
          borderColor: settlementItems.length > 0 ? '#FED7AA' : '#E5E7EB',
        }}
      >
        📋 정산 요약{settlementItems.length > 0 ? ` (${settlementItems.length}건)` : ''}
      </button>
    </div>
  );
}

export function WelfarePointsCard({ balance }) {
  return (
    <div className="stat-card">
      <div className="stat-label">복지포인트 잔액</div>
      <div className="stat-value" style={{ color: '#A78BFA', fontSize: 16 }}>
        {balance > 0 ? formatKRW(balance) : '−'}
      </div>
      <div className="stat-sub">사용 가능</div>
    </div>
  );
}

export function CardPerformanceCard({ monthTx }) {
  const TARGET = 300000;
  const cards = [
    { name: '신한카드', color: '#60A5FA', doneColor: '#34D399' },
    { name: '삼성카드', color: '#818CF8', doneColor: '#34D399' },
  ];

  return (
    <div className="stat-card" style={{ textAlign: 'left', padding: '14px 18px' }}>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>💳 카드 실적 (목표 30만원)</div>
      {cards.map(({ name, color, doneColor }) => {
        const spent = (monthTx || [])
          .filter((t) => t.type === 'expense' && t.paymentMethod === name)
          .reduce((s, t) => s + t.amount, 0);
        const pct = Math.min(100, Math.round((spent / TARGET) * 100));
        const done = spent >= TARGET;
        const barColor = done ? doneColor : color;
        return (
          <div key={name} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
                {done ? '✅ 달성!' : `${spent.toLocaleString()}원`}
              </span>
            </div>
            <div style={{ background: '#F3F4F6', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%', background: barColor,
                borderRadius: 4, transition: 'width 0.4s ease', minWidth: pct > 0 ? 4 : 0,
              }} />
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3, textAlign: 'right' }}>
              {done
                ? `${spent.toLocaleString()}원 / 목표 초과 달성`
                : `${(TARGET - spent).toLocaleString()}원 더 필요 (${pct}%)`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
