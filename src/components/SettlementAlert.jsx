import { calcSettlementAlerts, calcSelfPaidSummary } from '../utils';

// 정산 대기 중인 지출을 자동으로 감지해 알려주는 카드. 클릭하면 전체 목록 모달이 열린다.
export default function SettlementAlert({ allTransactions, onOpenAll }) {
  const { items, count, total, oldest } = calcSettlementAlerts(allTransactions);
  const { count: selfCount, total: selfTotal } = calcSelfPaidSummary(allTransactions);
  if (count === 0 && selfCount === 0) return null;

  const urgent = oldest && oldest.daysAgo >= 14;
  const accent = urgent ? '#C77D9B' : '#6D5FD0';

  // 어떤 항목들이 대기 중인지 "이름 금액" 형태로 바로 보이도록 (최대 4개)
  const itemPreview = items.slice(0, 4);

  return (
    <div
      className="stat-card"
      onClick={count > 0 ? onOpenAll : undefined}
      style={{
        textAlign: 'left', padding: '18px 20px',
        background: count > 0 ? (urgent ? '#F7EEF3' : '#F1EFFB') : '#fff',
        cursor: count > 0 ? 'pointer' : 'default',
      }}
    >
      {count > 0 ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{urgent ? '🔴' : '🔔'}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#1F2937' }}>정산 대기 {count}건</span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: accent }}>{total.toLocaleString()}원</span>
          </div>

          {oldest && (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', marginBottom: 10 }}>
              가장 오래된 항목 {oldest.daysAgo}일 경과
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {itemPreview.map((t) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                fontSize: 13, color: '#1F2937', background: '#fff',
                border: '1px solid #E5E1F5', borderRadius: 8, padding: '6px 10px',
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.description || t.category}
                </span>
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t.amount.toLocaleString()}원</span>
              </div>
            ))}
            {items.length > itemPreview.length && (
              <div style={{ fontSize: 12, fontWeight: 700, color: accent }}>
                +{items.length - itemPreview.length}건 더 (클릭하면 전체보기)
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: '#1F2937' }}>정산 대기 항목 없음 🎉</div>
      )}

      {selfCount > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E5E1F5', fontSize: 12, fontWeight: 600, color: '#1F2937' }}>
          👛 본인부담 {selfCount}건 ({selfTotal.toLocaleString()}원)
        </div>
      )}
    </div>
  );
}
