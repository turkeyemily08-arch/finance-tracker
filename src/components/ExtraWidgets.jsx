import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { formatKRW, needsSettle, calcWelfareBalance } from '../utils';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function CopyButtons({ transactions, allTransactions, stats, year, month, onSettleAll, onAdd }) {
  // "이번달 정산완료" 버튼은 이번 달 기준, "정산 요약" 복사는 월 무관하게 전체 대기 항목 기준(요청사항)
  const monthlySettlementItems = transactions.filter(needsSettle);
  const allSettlementItems = (allTransactions || transactions).filter(needsSettle);

  const [showBusPopover, setShowBusPopover] = useState(false);
  const [busDate, setBusDate] = useState(todayLocal());
  const [busAmount, setBusAmount] = useState(14700);

  const handleSettleAll = () => {
    if (!monthlySettlementItems.length) return;
    const ok = window.confirm(
      `${year}년 ${month}월 정산필요 항목 ${monthlySettlementItems.length}건(${monthlySettlementItems.reduce((s, t) => s + t.amount, 0).toLocaleString()}원)을 정산완료 처리할까요?`
    );
    if (!ok) return;
    onSettleAll(monthlySettlementItems.map((t) => t.id));
  };

  const copySettlement = () => {
    if (!allSettlementItems.length) { alert('정산 필요 항목이 없습니다.'); return; }
    const byCategory = {};
    const count = {};
    allSettlementItems.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      count[t.category] = (count[t.category] || 0) + 1;
    });
    const total = allSettlementItems.reduce((s, t) => s + t.amount, 0);
    const lines = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `• ${cat} (${count[cat]}건): ${amt.toLocaleString()}원`);
    const text = `📋 정산 요청 (전체 ${allSettlementItems.length}건)\n\n${lines.join('\n')}\n\n💰 합계: ${total.toLocaleString()}원`;
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

  const addBusFare = () => {
    onAdd({
      id: uuidv4(),
      date: busDate,
      type: 'expense',
      source: '공과금',
      category: '교통비',
      paymentMethod: '토스카드(커플)',
      amount: busAmount,
      description: '고속버스',
    });
    setShowBusPopover(false);
  };

  const btnBase = {
    fontSize: 12, padding: '6px 12px', borderRadius: 8,
    border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
      <button onClick={copyReport} style={{ ...btnBase, color: '#374151' }}>
        📄 월간 리포트
      </button>

      <button onClick={() => setShowBusPopover((v) => !v)} style={{ ...btnBase, color: '#7C6FE8' }}>
        🚌 고속버스
      </button>
      {showBusPopover && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 60, zIndex: 20,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
          padding: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 220,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
            🚌 고속버스 (공과금 · 토스카드(커플))
          </div>
          <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>날짜</label>
          <input
            type="date" value={busDate} onChange={(e) => setBusDate(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, marginBottom: 10 }}
          />
          <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>금액</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[14700, 29400].map((amt) => (
              <button
                key={amt}
                onClick={() => setBusAmount(amt)}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                  border: `1px solid ${busAmount === amt ? '#7C6FE8' : '#E5E7EB'}`,
                  background: busAmount === amt ? '#F1EFFB' : '#fff',
                  color: busAmount === amt ? '#7C6FE8' : '#6B7280', fontWeight: busAmount === amt ? 700 : 400,
                }}
              >
                {amt.toLocaleString()}원
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setShowBusPopover(false)} style={{ ...btnBase, flex: 1, color: '#9CA3AF' }}>취소</button>
            <button onClick={addBusFare} style={{ ...btnBase, flex: 1, background: '#7C6FE8', color: '#fff', border: 'none' }}>추가</button>
          </div>
        </div>
      )}

      <button
        onClick={copySettlement}
        style={{
          ...btnBase,
          background: allSettlementItems.length > 0 ? '#F1EFFB' : '#fff',
          color: allSettlementItems.length > 0 ? '#6D5FD0' : '#9CA3AF',
          borderColor: allSettlementItems.length > 0 ? '#DDD6F3' : '#E5E7EB',
        }}
      >
        📋 정산 요약{allSettlementItems.length > 0 ? ` (전체 ${allSettlementItems.length}건)` : ''}
      </button>
      {monthlySettlementItems.length > 0 && (
        <button
          onClick={handleSettleAll}
          style={{ ...btnBase, background: '#E7F6EE', color: '#3DAA71', borderColor: '#C2E9D5' }}
        >
          ✅ 이번달 정산완료
        </button>
      )}
    </div>
  );
}

export function WelfarePointsCard({ balance, allTransactions }) {
  const effective = allTransactions ? calcWelfareBalance({ welfarePointsBalance: balance }, allTransactions) : balance;
  return (
    <div className="stat-card">
      <div className="stat-label">복지포인트 잔액</div>
      <div className="stat-value" style={{ color: '#A78BFA', fontSize: 16 }}>
        {effective > 0 ? formatKRW(effective) : '−'}
      </div>
      <div className="stat-sub">사용 가능</div>
    </div>
  );
}

export function CardPerformanceCard({ monthTx }) {
  const TARGET = 300000;
  const cards = [
    { name: '신한카드', color: '#8B7FE8', doneColor: '#3DAA71' },
    { name: '삼성카드', color: '#7C6FE8', doneColor: '#3DAA71' },
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
