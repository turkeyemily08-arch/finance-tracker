import { formatDate } from '../utils';

// 정산 대기 중인 항목을 월 구분 없이 한 번에 모아 보여주는 모달.
// SettlementAlert 배너를 클릭하면 열린다.
export default function SettlementListModal({ items, total, onClose, onSettle }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(560px, 95vw)' }}>
        <div className="modal-title">🔔 정산 대기 {items.length}건 · 총 {total.toLocaleString()}원</div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '24px 0', fontSize: 13 }}>정산 대기 항목이 없어요 🎉</div>
          )}
          {items.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: t.daysAgo >= 14 ? '#F7EEF3' : '#F8FAFC',
                border: `1px solid ${t.daysAgo >= 14 ? '#E9CFDD' : '#EEF0F4'}`,
              }}
            >
              <span style={{ fontSize: 12, color: '#9CA3AF', minWidth: 44 }}>{formatDate(t.date)}</span>
              <span className="cat-badge" style={{ flexShrink: 0 }}>{t.category}</span>
              <span style={{ flex: 1, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.description || '−'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{t.amount.toLocaleString()}원</span>
              <span style={{ fontSize: 11, color: t.daysAgo >= 14 ? '#C77D9B' : '#B0A8DB', whiteSpace: 'nowrap' }}>{t.daysAgo}일</span>
              <button
                onClick={() => onSettle(t.id)}
                title="정산완료 처리"
                style={{
                  border: '1px solid #CDEBDD', background: '#EAF6F1', color: '#3DAA71',
                  borderRadius: 8, fontSize: 11, padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                ✅ 완료
              </button>
            </div>
          ))}
        </div>
        <div className="modal-btns">
          <button type="button" className="btn-cancel" onClick={onClose} style={{ flex: 1 }}>닫기</button>
        </div>
      </div>
    </div>
  );
}
