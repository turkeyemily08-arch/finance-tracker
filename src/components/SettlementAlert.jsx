import { calcSettlementAlerts, calcSelfPaidSummary } from '../utils';

// 정산 대기 중인 지출을 자동으로 감지해 알려주는 카드. 클릭하면 전체 목록 모달이 열린다.
// 복지포인트 잔액 카드 정도의 크기로 압축 — 상세 목록은 모달에서 확인.
export default function SettlementAlert({ allTransactions, onOpenAll }) {
  const { count, total, oldest } = calcSettlementAlerts(allTransactions);
  const { count: selfCount, total: selfTotal } = calcSelfPaidSummary(allTransactions);
  if (count === 0 && selfCount === 0) return null;

  const urgent = oldest && oldest.daysAgo >= 14;

  return (
    <div
      className="stat-card"
      onClick={count > 0 ? onOpenAll : undefined}
      style={{
        textAlign: 'left', padding: '14px 16px',
        background: count > 0 ? (urgent ? '#F7EEF3' : '#F1EFFB') : '#fff',
        cursor: count > 0 ? 'pointer' : 'default',
      }}
    >
      {count > 0 ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>{urgent ? '🔴' : '🔔'}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: urgent ? '#C77D9B' : '#6D5FD0' }}>정산 대기</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: urgent ? '#C77D9B' : '#6D5FD0' }}>{count}건</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>총 {total.toLocaleString()}원</div>
          {oldest && (
            <div style={{ fontSize: 11, color: urgent ? '#C77D9B' : '#9D8CF0', marginTop: 4 }}>
              가장 오래된 항목 {oldest.daysAgo}일 경과
            </div>
          )}
          <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>클릭하면 전체보기</div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>정산 대기 항목 없음 🎉</div>
      )}
      {selfCount > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #E5E1F5', fontSize: 10, color: '#9CA3AF' }}>
          👛 본인부담 {selfCount}건 ({selfTotal.toLocaleString()}원)
        </div>
      )}
    </div>
  );
}
