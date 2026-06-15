import { useState } from 'react';
import { formatDate, formatKRW } from '../utils';
import {
  SOURCE_COLORS, PAYMENT_METHOD_COLORS, SOURCE_OPTIONS,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS,
} from '../constants';
import TransactionModal from './TransactionModal';

const catOptionsFor = (type, source) =>
  type === 'income' ? INCOME_CATEGORIES : (EXPENSE_CATEGORIES[source] || []);

export default function TransactionTable({ transactions, onUpdate, onDelete, onAdd }) {
  const [filter, setFilter] = useState('전체');
  const [search, setSearch] = useState('');
  const [editTx, setEditTx] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const filters = ['전체', '수입', '지출', '공과금', '용돈', '복지포인트', '정산필요'];

  const filtered = transactions
    .filter((t) => {
      if (filter === '전체') return true;
      if (filter === '수입') return t.type === 'income';
      if (filter === '지출') return t.type === 'expense';
      if (filter === '정산필요') return (t.memo || '').includes('정산필요');
      return t.source === filter;
    })
    .filter((t) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        (t.description || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.memo || '').toLowerCase().includes(q) ||
        (t.paymentMethod || '').toLowerCase().includes(q)
      );
    });

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = filtered.filter(t => t.type === 'income' && t.source !== '정산').reduce((s, t) => s + t.amount, 0);

  // 재원 변경 시 카테고리가 유효하지 않으면 첫 항목으로 보정
  const changeSource = (tx, newSource) => {
    const cats = catOptionsFor(tx.type, newSource);
    const category = cats.includes(tx.category) ? tx.category : (cats[0] || '');
    onUpdate({ ...tx, source: newSource, category });
  };

  const sourceOptionsFor = (tx) => {
    const opts = SOURCE_OPTIONS[tx.type] || [];
    return opts.includes(tx.source) ? opts : [tx.source, ...opts];
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
            placeholder="🔍 내용/카테고리/결제수단 검색"
            style={{
              fontSize: 13, padding: '6px 10px', borderRadius: 8,
              border: '1px solid #E5E7EB', outline: 'none', width: 200, color: '#374151',
            }}
          />
          <button className="add-btn" onClick={() => setShowAdd(true)}>＋ 추가</button>
          <div className="tx-filters">
            {filters.map((f) => (
              <button
                key={f}
                className={filter === f ? 'active' : ''}
                onClick={() => setFilter(f)}
                style={f === '정산필요' && filter !== f ? { color: '#E08090', borderColor: '#F4A7C0' } :
                       f === '정산필요' && filter === f ? { background: '#E08090', borderColor: '#E08090', color: '#fff' } : {}}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {search.trim() && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          margin: '10px 0', padding: '10px 14px', background: '#F8FAFC',
          border: '1px solid #E5E7EB', borderRadius: 10,
        }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>
            검색 결과 <b style={{ color: '#374151' }}>{sorted.length}건</b>
          </span>
          {totalExpense > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: '#E08090' }}>지출 합계 {totalExpense.toLocaleString()}원</span>}
          {totalIncome > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: '#5BADA0' }}>수입 합계 {totalIncome.toLocaleString()}원</span>}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="tx-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>재원</th>
              <th>카테고리</th>
              <th>결제수단</th>
              <th style={{ minWidth: 180 }}>내용</th>
              <th style={{ width: 90 }}>메모</th>
              <th style={{ textAlign: 'right' }}>금액</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx) => (
              <tr key={tx.id}>
                <td style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>{formatDate(tx.date)}</td>
                <td>
                  <select
                    className="inline-select src"
                    value={tx.source}
                    onChange={(e) => changeSource(tx, e.target.value)}
                    style={{
                      color: SOURCE_COLORS[tx.source] || '#64748B',
                      background: (SOURCE_COLORS[tx.source] || '#94A3B8') + '22',
                    }}
                  >
                    {sourceOptionsFor(tx).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <select
                    className="inline-select cat"
                    value={tx.category}
                    onChange={(e) => onUpdate({ ...tx, category: e.target.value })}
                  >
                    {catOptionsFor(tx.type, tx.source).map((c) => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td>
                  <select
                    className="inline-select pay"
                    value={tx.paymentMethod || ''}
                    onChange={(e) => onUpdate({ ...tx, paymentMethod: e.target.value })}
                    style={{
                      color: tx.paymentMethod ? (PAYMENT_METHOD_COLORS[tx.paymentMethod] || '#64748B') : '#C4C4CC',
                      background: tx.paymentMethod ? (PAYMENT_METHOD_COLORS[tx.paymentMethod] || '#94A3B8') + '22' : 'transparent',
                    }}
                  >
                    <option value="">－</option>
                    {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </td>
                <td style={{ minWidth: 180 }}>
                  <input
                    className="inline-input desc"
                    value={tx.description}
                    onChange={(e) => onUpdate({ ...tx, description: e.target.value })}
                  />
                </td>
                <td style={{ width: 90 }}>
                  <input
                    className="inline-input memo"
                    value={tx.memo || ''}
                    placeholder=""
                    onChange={(e) => onUpdate({ ...tx, memo: e.target.value })}
                  />
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span className={tx.type === 'expense' ? 'amount-expense' : 'amount-income'}>
                    {tx.type === 'expense' ? '−' : '+'}{formatKRW(tx.amount)}
                  </span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="edit-btn" onClick={() => setEditTx(tx)} title="날짜·금액 등 상세 수정">✎</button>
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
