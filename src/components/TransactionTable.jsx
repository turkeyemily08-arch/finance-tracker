import { useState } from 'react';
import { formatDate, formatKRW } from '../utils';
import { SOURCE_COLORS } from '../constants';
import TransactionModal from './TransactionModal';

export default function TransactionTable({ transactions, onUpdate, onDelete, onAdd }) {
  const [filter, setFilter] = useState('전체');
  const [editTx, setEditTx] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const filters = ['전체', '수입', '지출', '공과금', '용돈', '복지포인트'];
  const filtered = transactions.filter((t) => {
    if (filter === '전체') return true;
    if (filter === '수입') return t.type === 'income';
    if (filter === '지출') return t.type === 'expense';
    return t.source === filter;
  });

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="tx-card">
      <div className="tx-header">
        <span className="tx-title">거래 내역</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="add-btn" onClick={() => setShowAdd(true)}>＋ 추가</button>
          <div className="tx-filters">
            {filters.map((f) => (
              <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="tx-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>재원</th>
              <th>카테고리</th>
              <th>내용</th>
              <th>메모</th>
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
                <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description}
                </td>
                <td style={{ minWidth: 80 }}>
                  <input
                    className="memo-input"
                    value={tx.memo || ''}
                    placeholder="메모..."
                    onChange={(e) => onUpdate({ ...tx, memo: e.target.value })}
                  />
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
