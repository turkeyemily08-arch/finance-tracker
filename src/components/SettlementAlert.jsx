import { calcSettlementAlerts, formatDate } from '../utils';

// 정산필요 태그가 붙은 지출 중 미정산 항목을 자동으로 감지해 알려주는 배너.
// 월 선택과 무관하게 전체 거래를 대상으로 하며, 오래될수록 경고 색으로 강조된다.
export default function SettlementAlert({ allTransactions }) {
  const { items, count, total, oldest } = calcSettlementAlerts(allTransactions);
  if (count === 0) return null;

  const urgent = oldest && oldest.daysAgo >= 14;
  const preview = items.slice(0, 3);

  return (
    <div
      className="card"
      style={{
        padding: '14px 18px',
        background: urgent ? '#F7EEF3' : '#F1EFFB',
        border: `1px solid ${urgent ? '#E9CFDD' : '#DDD6F3'}`,
        boxShadow: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>{urgent ? '🔴' : '🔔'}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: urgent ? '#C77D9B' : '#6D5FD0' }}>
            정산 대기 {count}건
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: urgent ? '#C77D9B' : '#6D5FD0' }}>
            · 총 {total.toLocaleString()}원
          </span>
        </div>
        {oldest && (
          <span style={{ fontSize: 12, color: urgent ? '#C77D9B' : '#9D8CF0' }}>
            가장 오래된 항목 {oldest.daysAgo}일 경과
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {preview.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#4B5563' }}>
            <span style={{ color: '#9CA3AF', minWidth: 40 }}>{formatDate(t.date)}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || t.category}</span>
            <span style={{ fontWeight: 600 }}>{t.amount.toLocaleString()}원</span>
            <span style={{ color: t.daysAgo >= 14 ? '#C77D9B' : '#B0A8DB', fontSize: 11 }}>{t.daysAgo}일</span>
          </div>
        ))}
        {count > preview.length && (
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>+{count - preview.length}건 더 있어요 (거래내역에서 '정산필요' 필터 확인)</div>
        )}
      </div>
    </div>
  );
}
