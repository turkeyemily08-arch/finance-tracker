import { useState } from 'react';
import { formatDate, formatKRW } from '../utils';
import { SOURCE_COLORS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants';
import TransactionModal from './TransactionModal';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const weekday = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d) ? '' : WD[d.getDay()];
};

export default function TransactionTable({ transactions, onUpdate, onDelete, onAdd }) {
  const [filter, setFilter] = useState('전체');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [dateEditId, setDateEditId] = useState(null);

  const filters = ['전체', '수입', '지출', '공과금', '용돈', '복지포인트', '정산필요'];
  const filtered = transactions.filter((t) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const hit = (t.memo || '').toLowerCase().includes(q)
        || (t.category || '').toLowerCase().includes(q)
        || (t.description || '').toLowerCase().includes(q)
        || (t.paymentMethod || '').toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (filter === '전체') return true;
    if (filter === '수입') return t.type === 'income';
    if (filter === '지출') return t.type === 'expense';
    if (filter === '정산필요') return (t.memo || '').includes('정산필요');
    return t.source === filter;
  });

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  // 검색어가 있을 때, 검색 결과 지출/수입 합계 계산
  const q = search.trim();
  const searchExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const searchIncome = filtered.filter((t) => t.type === 'income' && t.source !== '정산').reduce((s, t) => s + t.amount, 0);

  // 인라인 편집용 옵션 (기존 값이 목록에 없으면 보존해서 맨 앞에 추가)
  const sourceOptions = (tx) => {
    let opts = tx.type === 'income' ? ['급여', '정산', '복지포인트'] : ['공과금', '용돈', '복지포인트'];
    if (tx.source && !opts.includes(tx.source)) opts = [tx.source, ...opts];
    return opts;
  };
  const categoryOptions = (tx) => {
    let opts = tx.type === 'income' ? INCOME_CATEGORIES : (EXPENSE_CATEGORIES[tx.source] || []);
    if (tx.category && !opts.includes(tx.category)) opts = [tx.category, ...opts];
    return opts;
  };
  const paymentOptions = (tx) => {
    let opts = [...PAYMENT_METHODS];
    if (tx.paymentMethod && !opts.includes(tx.paymentMethod)) opts = [tx.paymentMethod, ...opts];
    return opts;
  };

  const selectReset = { border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' };

  return (
    <div className="tx-card">
      <div className="tx-header">
        <span className="tx-title">거래 내역</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 메모/카테고리 검색"
            style={{
              fontSize: 12, padding: '5px 10px', borderRadius: 8,
              border: '1px solid #E5E7EB', outline: 'none', width: 160, color: '#374151',
            }}
          />
          <button className="add-btn" onClick={() => setShowAdd(true)}>＋ 추가</button>
          <div className="tx-filters">
            {filters.map((f) => (
              <button
                key={f}
                className={filter === f ? 'active' : ''}
                onClick={() => setFilter(f)}
                style={f === '정산필요' && filter === f ? { background: '#E06666', color: '#fff' } : f === '정산필요' ? { color: '#E06666', borderColor: '#E06666' } : undefined}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {q && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          margin: '10px 0', padding: '10px 14px', background: '#F8FAFC',
          border: '1px solid #E5E7EB', borderRadius: 10, minHeight: 40, boxSizing: 'border-box',
        }}>
          <span style={{ fontSize: 12, color: '#6B7280' }}>
            🔍 <b style={{ color: '#374151' }}>"{q}"</b> 검색 결과 <b>{sorted.length}건</b>
          </span>
          {searchExpense > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#E06666' }}>
              지출 합계 {searchExpense.toLocaleString()}원
            </span>
          )}
          {searchIncome > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>
              수입 합계 {searchIncome.toLocaleString()}원
            </span>
          )}
          {sorted.length === 0 && (
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>일치하는 거래가 없어요</span>
          )}
        </div>
      )}

      <div style={{ overflowX: 'auto', minHeight: q ? 160 : undefined }}>
        <table className="tx-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>재원</th>
              <th>카테고리</th>
              <th>결제</th>
              <th>내용</th>
              <th>메모</th>
              <th>금액</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx) => (
              <tr key={tx.id}>
                {/* 날짜 + (요일) — 클릭하면 날짜 선택 */}
                <td style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>
                  {dateEditId === tx.id ? (
                    <input
                      type="date"
                      autoFocus
                      value={tx.date}
                      onChange={(e) => onUpdate({ ...tx, date: e.target.value })}
                      onBlur={() => setDateEditId(null)}
                      style={{ ...selectReset, background: '#EFF6FF', borderRadius: 4, fontSize: 12, color: '#1F2937', padding: '2px 4px' }}
                    />
                  ) : (
                    <span
                      onClick={() => setDateEditId(tx.id)}
                      style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
                      title="클릭하면 날짜 변경"
                    >
                      {formatDate(tx.date)} <span style={{ color: '#9CA3AF', fontSize: 11 }}>({weekday(tx.date)})</span>
                    </span>
                  )}
                </td>

                {/* 재원 드롭다운 (배지 모양 유지) */}
                <td>
                  <select
                    value={tx.source}
                    onChange={(e) => {
                      const ns = e.target.value;
                      const cats = tx.type === 'income' ? INCOME_CATEGORIES : (EXPENSE_CATEGORIES[ns] || []);
                      const nc = cats.includes(tx.category) ? tx.category : (cats[0] || tx.category);
                      onUpdate({ ...tx, source: ns, category: nc });
                    }}
                    style={{
                      ...selectReset, borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                      background: (SOURCE_COLORS[tx.source] || '#9CA3AF') + '22',
                      color: SOURCE_COLORS[tx.source] || '#6B7280',
                    }}
                  >
                    {sourceOptions(tx).map((s) => <option key={s} value={s} style={{ color: '#1F2937', fontWeight: 400 }}>{s}</option>)}
                  </select>
                </td>

                {/* 카테고리 드롭다운 (배지 모양 유지) */}
                <td>
                  <select
                    value={tx.category}
                    onChange={(e) => onUpdate({ ...tx, category: e.target.value })}
                    style={{
                      ...selectReset, borderRadius: 12, padding: '2px 8px', fontSize: 11,
                      background: '#F3F4F6', color: '#374151', maxWidth: 130,
                    }}
                  >
                    {categoryOptions(tx).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>

                {/* 결제수단 드롭다운 (회색 알약 모양 유지) */}
                <td style={{ whiteSpace: 'nowrap' }}>
                  <select
                    value={tx.paymentMethod || ''}
                    onChange={(e) => onUpdate({ ...tx, paymentMethod: e.target.value })}
                    style={{
                      ...selectReset, borderRadius: 4, padding: '2px 6px', fontSize: 11,
                      background: '#F3F4F6', color: tx.paymentMethod ? '#374151' : '#9CA3AF',
                    }}
                  >
                    <option value="">−</option>
                    {paymentOptions(tx).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>

                {/* 내용(description) — 바로 수정, 글자색 진하게 */}
                <td style={{ minWidth: 110 }}>
                  <input
                    className="memo-input"
                    style={{ color: '#374151' }}
                    value={tx.description || ''}
                    placeholder="내용..."
                    onChange={(e) => onUpdate({ ...tx, description: e.target.value })}
                  />
                </td>

                {/* 메모 — 바로 수정 */}
                <td style={{ minWidth: 100 }}>
                  <input
                    className="memo-input"
                    value={tx.memo || ''}
                    placeholder="메모..."
                    onChange={(e) => onUpdate({ ...tx, memo: e.target.value })}
                  />
                </td>

                {/* 금액 — 왼쪽 정렬 */}
                <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                  <span className={tx.type === 'expense' ? 'amount-expense' : 'amount-income'}>
                    {tx.type === 'expense' ? '−' : '+'}{formatKRW(tx.amount)}
                  </span>
                </td>

                <td>
                  <button className="delete-btn" onClick={() => onDelete(tx.id)} title="삭제">✕</button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px 0' }}>
                  거래 내역이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <TransactionModal
          onClose={() => setShowAdd(false)}
          onSave={(tx) => { onAdd(tx); setShowAdd(false); }}
        />
      )}
    </div>
  );
}
