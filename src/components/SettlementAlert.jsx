import { calcSettlementAlerts, calcSelfPaidSummary } from '../utils';

// 정산 대기 중인 지출을 자동으로 감지해 알려주는 카드. 클릭하면 전체 목록 모달이 열린다.
export default function SettlementAlert({ allTransactions, onOpenAll }) {
  const { items, count, total, oldest } = calcSettlementAlerts(allTransactions);
  const { count: selfCount, total: selfTotal } = calcSelfPaidSummary(allTransactions);
  if (count === 0 && selfCount === 0) return null;

  const urgent = oldest && oldest.daysAgo >= 14;
  const accent = urgent ? '#C77D9B' : '#6D5FD0';

  // 어떤 카테고리들이 대기 중인지 한눈에 보이도록 미리보기 (최대 4개)
  const catCounts = {};
  items.forEach((t) => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
  const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const catPreview = catEntries.slice(0, 4);

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

          {catPreview.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {catPreview.map(([cat, cnt]) => (
                <span key={cat} style={{
                  fontSize: 12, fontWeight: 700, color: '#1F2937',
                  background: '#fff', border: '1px solid #E5E1F5', borderRadius: 8, padding: '4px 9px',
                }}>
                  {cat} {cnt}
                </span>
              ))}
              {catEntries.length > catPreview.length && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', padding: '4px 2px' }}>
                  +{catEntries.length - catPreview.length}
                </span>
              )}
            </div>
          )}

          <div style={{ fontSize: 13, fontWeight: 700, color: accent }}>클릭하면 전체보기 →</div>
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
