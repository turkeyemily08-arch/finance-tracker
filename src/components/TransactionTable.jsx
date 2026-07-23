import { useState, useEffect } from 'react';
import { formatDate, formatKRW, needsSettle, isSelfPaid } from '../utils';
import { SOURCE_COLORS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants';
import TransactionModal from './TransactionModal';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const weekday = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d) ? '' : WD[d.getDay()];
};

// 편집 중에만 보이는 드롭다운/입력 스타일
const editStyle = {
  fontSize: 14, padding: '3px 6px', borderRadius: 8,
  border: '1px solid #7C6FE8', outline: 'none', background: '#fff',
  color: '#1F2937', cursor: 'pointer',
};

export default function TransactionTable({ transactions, onUpdate, onDelete, onAdd, externalSearch }) {
  const [filter, setFilter] = useState('전체');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editCell, setEditCell] = useState(null); // { id, field }

  // 차트 막대를 클릭하면(App.jsx) 여기로 검색어가 전달돼 즉시 해당 카테고리로 필터링됨
  useEffect(() => {
    if (externalSearch?.term !== undefined) setSearch(externalSearch.term);
  }, [externalSearch]);

  const isEditing = (tx, field) => editCell && editCell.id === tx.id && editCell.field === field;
  const startEdit = (tx, field) => setEditCell({ id: tx.id, field });
  const stopEdit = () => setEditCell(null);

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
    if (filter === '정산필요') return needsSettle(t);
    return t.source === filter;
  });

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  // 검색어가 있을 때, 검색 결과 지출/수입 합계 계산
  const q = search.trim();
  const searchExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const searchIncome = filtered.filter((t) => t.type === 'income' && t.source !== '정산').reduce((s, t) => s + t.amount, 0);

  // 인라인 편집용 옵션 (기존 값이 목록에 없으면 보존해서 맨 앞에 추가)
  const sourceOptions = (tx) => {
    let opts = tx.type === 'income' ? ['급여', '정산', '복지포인트', '용돈', '기타'] : ['공과금', '용돈', '복지포인트', '기타'];
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
                style={f === '정산필요' && filter === f ? { background: '#C77D9B', color: '#fff' } : f === '정산필요' ? { color: '#C77D9B', borderColor: '#C77D9B' } : undefined}
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
            <span style={{ fontSize: 13, fontWeight: 700, color: '#C2568C' }}>
              지출 합계 {searchExpense.toLocaleString()}원
            </span>
          )}
          {searchIncome > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#3DAA71' }}>
              수입 합계 {searchIncome.toLocaleString()}원
            </span>
          )}
          {sorted.length === 0 && (
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>일치하는 거래가 없어요</span>
          )}
        </div>
      )}

      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', minHeight: q ? 160 : undefined }}>
        <table className="tx-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>재원</th>
              <th>카테고리</th>
              <th>결제</th>
              <th>내용</th>
              <th>금액</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx) => (
              <tr key={tx.id}>
                {/* 날짜 + (요일) — 클릭하면 날짜 선택 */}
                <td style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>
                  {isEditing(tx, 'date') ? (
                    <input
                      type="date"
                      autoFocus
                      value={tx.date}
                      onChange={(e) => onUpdate({ ...tx, date: e.target.value })}
                      onBlur={stopEdit}
                      style={editStyle}
                    />
                  ) : (
                    <span onClick={() => startEdit(tx, 'date')} style={{ cursor: 'pointer' }} title="클릭하면 날짜 변경">
                      {formatDate(tx.date)} <span style={{ color: '#9CA3AF', fontSize: 13 }}>({weekday(tx.date)})</span>
                    </span>
                  )}
                </td>

                {/* 재원 — 평소엔 배지, 클릭하면 드롭다운 */}
                <td>
                  {isEditing(tx, 'source') ? (
                    <select
                      autoFocus
                      value={tx.source}
                      onChange={(e) => {
                        const ns = e.target.value;
                        const cats = tx.type === 'income' ? INCOME_CATEGORIES : (EXPENSE_CATEGORIES[ns] || []);
                        const nc = cats.includes(tx.category) ? tx.category : (cats[0] || tx.category);
                        onUpdate({ ...tx, source: ns, category: nc });
                        stopEdit();
                      }}
                      onBlur={stopEdit}
                      style={editStyle}
                    >
                      {sourceOptions(tx).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span
                      className="source-badge"
                      style={{ background: (SOURCE_COLORS[tx.source] || '#9CA3AF') + '22', color: SOURCE_COLORS[tx.source] || '#6B7280', cursor: 'pointer' }}
                      onClick={() => startEdit(tx, 'source')}
                    >
                      {tx.source}
                    </span>
                  )}
                </td>

                {/* 카테고리 — 평소엔 배지, 클릭하면 드롭다운 */}
                <td>
                  {isEditing(tx, 'category') ? (
                    <select
                      autoFocus
                      value={tx.category}
                      onChange={(e) => { onUpdate({ ...tx, category: e.target.value }); stopEdit(); }}
                      onBlur={stopEdit}
                      style={editStyle}
                    >
                      {categoryOptions(tx).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <span className="cat-badge" style={{ cursor: 'pointer' }} onClick={() => startEdit(tx, 'category')}>
                      {tx.category}
                    </span>
                  )}
                </td>

                {/* 결제수단 — 평소엔 알약, 클릭하면 드롭다운 */}
                <td style={{ whiteSpace: 'nowrap' }}>
                  {isEditing(tx, 'payment') ? (
                    <select
                      autoFocus
                      value={tx.paymentMethod || ''}
                      onChange={(e) => { onUpdate({ ...tx, paymentMethod: e.target.value }); stopEdit(); }}
                      onBlur={stopEdit}
                      style={editStyle}
                    >
                      <option value="">선택 안함</option>
                      {paymentOptions(tx).map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : tx.paymentMethod ? (
                    <span
                      style={{ fontSize: 14, padding: '3px 7px', borderRadius: 4, background: '#F3F4F6', color: '#374151', cursor: 'pointer' }}
                      onClick={() => startEdit(tx, 'payment')}
                    >
                      {tx.paymentMethod}
                    </span>
                  ) : (
                    <span style={{ color: '#D1D5DB', fontSize: 14, cursor: 'pointer', padding: '0 4px' }} onClick={() => startEdit(tx, 'payment')}>−</span>
                  )}
                </td>

                {/* 내용(description, 메모 통합) — 바로 수정, 글자색 진하게 */}
                <td style={{ minWidth: 120 }}>
                  <input
                    className="memo-input"
                    style={{ color: '#374151' }}
                    value={tx.description || ''}
                    placeholder="내용..."
                    onChange={(e) => onUpdate({ ...tx, description: e.target.value })}
                  />
                </td>

                {/* 금액 — 왼쪽 정렬, 클릭하면 바로 수정 */}
                <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {isEditing(tx, 'amount') ? (
                    <input
                      type="number"
                      autoFocus
                      defaultValue={tx.amount}
                      min="0"
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!isNaN(v) && v >= 0 && v !== tx.amount) onUpdate({ ...tx, amount: v });
                        stopEdit();
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      style={{ ...editStyle, width: 110, textAlign: 'left' }}
                    />
                  ) : (
                    <span
                      className={tx.type === 'expense' ? 'amount-expense' : 'amount-income'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => startEdit(tx, 'amount')}
                      title="클릭하면 금액 수정"
                    >
                      {tx.type === 'expense' ? '−' : '+'}{formatKRW(tx.amount)}
                    </span>
                  )}
                </td>

                <td style={{ whiteSpace: 'nowrap' }}>
                  {tx.type === 'expense' && (() => {
                    const on = needsSettle(tx);
                    return (
                      <button
                        onClick={() => onUpdate({ ...tx, needsSettlement: !on })}
                        title={on ? '클릭하면 정산완료 처리' : '클릭하면 정산필요로 표시'}
                        style={{
                          border: 'none', background: 'transparent', cursor: 'pointer',
                          fontSize: 15, marginRight: 4, opacity: on ? 1 : 0.28,
                          filter: on ? 'none' : 'grayscale(1)',
                        }}
                      >🔖</button>
                    );
                  })()}
                  {tx.type === 'expense' && tx.source === '공과금' && (() => {
                    const self = isSelfPaid(tx);
                    return (
                      <button
                        onClick={() => {
                          if (self) {
                            const next = { ...tx, selfPaid: false };
                            delete next.needsSettlement;
                            onUpdate(next);
                          } else {
                            onUpdate({ ...tx, selfPaid: true, needsSettlement: false });
                          }
                        }}
                        title={self ? '클릭하면 본인부담 해제' : '클릭하면 본인부담으로 표시(정산 요청 안 함)'}
                        style={{
                          border: 'none', background: 'transparent', cursor: 'pointer',
                          fontSize: 15, marginRight: 4, opacity: self ? 1 : 0.28,
                          filter: self ? 'none' : 'grayscale(1)',
                        }}
                      >👛</button>
                    );
                  })()}
                  <button className="delete-btn" onClick={() => onDelete(tx.id)} title="삭제">✕</button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px 0' }}>
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
