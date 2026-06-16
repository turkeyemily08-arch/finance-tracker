import { useState } from 'react';
import { formatDate, formatKRW } from '../utils';
import { SOURCE_COLORS } from '../constants';
import TransactionModal from './TransactionModal';

export default function TransactionTable({ transactions, onUpdate, onDelete, onAdd }) {
  const [filter, setFilter] = useState('전체');
  const [search, setSearch] = useState('');
  const [editTx, setEditTx] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

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
              <th>메모</th>
              <th>내용</th>
              <th style={{ textAlign: 'right' }}>금액</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx) => (
              <tr key={tx.id} onDoubleClick={() => setEditTx(tx)} style={{ cursor: 'pointer' }}>
                <td style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>{formatDate(tx.date)}</td>
                <td>
                  <span
                    className="source-badge"
                    style={{
                      background: SOURCE_COLORS[tx.source] + '22',
                      color: SOURCE_COLORS[tx.source],
                    }}
                  >
                    {tx.source}
                  </span>
                </td>
                <td><span className="cat-badge">{tx.category}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {tx.paymentMethod
                    ? <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#F3F4F6', color: '#374151' }}>{tx.paymentMethod}</span>
                    : <span style={{ color: '#D1D5DB', fontSize: 11 }}>−</span>}
                </td>
                <td style={{ minWidth: 100 }}>
                  <input
                    className="memo-input"
                    value={tx.memo || ''}
                    placeholder="메모..."
                    onChange={(e) => onUpdate({ ...tx, memo: e.target.value })}
                  />
                </td>
                <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#9CA3AF' }}>
                  {tx.description || ''}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
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
                <td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px 0' }}>
                  거래 내역이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(editTx || showAdd) && (
        <TransactionModal
          initial={editTx || undefined}
          onClose={() => { setEditTx(null); setShowAdd(false); }}
          onSave={(tx) => {
            if (editTx) onUpdate(tx);
            else onAdd(tx);
            setEditTx(null);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
