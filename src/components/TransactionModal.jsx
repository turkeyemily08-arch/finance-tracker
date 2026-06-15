import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, SOURCE_OPTIONS } from '../constants';

const DEFAULT = {
  date: new Date().toISOString().slice(0, 10),
  type: 'expense',
  source: '용돈',
  category: '식비/외식',
  paymentMethod: '',
  description: '',
  amount: '',
  memo: '',
};

export default function TransactionModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || DEFAULT);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const sourceOptions = SOURCE_OPTIONS[form.type] || [];

  const categoryOptions =
    form.type === 'income'
      ? INCOME_CATEGORIES
      : EXPENSE_CATEGORIES[form.source] || [];

  useEffect(() => {
    const cats = form.type === 'income' ? INCOME_CATEGORIES : (EXPENSE_CATEGORIES[form.source] || []);
    if (!cats.includes(form.category)) set('category', cats[0] || '');
  }, [form.type, form.source]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    onSave({
      ...form,
      id: form.id || uuidv4(),
      amount: Number(String(form.amount).replace(/,/g, '')),
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initial ? '거래 수정' : '새 거래 추가'}</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row-2" style={{ marginBottom: 14 }}>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="form-label">날짜</label>
              <input className="form-input" type="date" value={form.date}
                onChange={(e) => set('date', e.target.value)} required />
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="form-label">구분</label>
              <select className="form-select" value={form.type}
                onChange={(e) => { set('type', e.target.value); set('source', e.target.value === 'income' ? '급여' : '용돈'); }}>
                <option value="expense">지출</option>
                <option value="income">수입</option>
              </select>
            </div>
          </div>

          <div className="form-row-2" style={{ marginBottom: 14 }}>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="form-label">재원</label>
              <select className="form-select" value={form.source}
                onChange={(e) => set('source', e.target.value)}>
                {sourceOptions.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="form-label">카테고리</label>
              <select className="form-select" value={form.category}
                onChange={(e) => set('category', e.target.value)}>
                {categoryOptions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">결제수단</label>
            <select className="form-select" value={form.paymentMethod || ''}
              onChange={(e) => set('paymentMethod', e.target.value)}>
              <option value="">선택 안함</option>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">내용</label>
            <input className="form-input" value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="거래 내용을 입력하세요" required />
          </div>

          <div className="form-row">
            <label className="form-label">금액 (원)</label>
            <input className="form-input" type="number" value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0" min="0" required />
          </div>

          <div className="form-row">
            <label className="form-label">메모 (선택)</label>
            <input className="form-input" value={form.memo}
              onChange={(e) => set('memo', e.target.value)}
              placeholder="메모를 입력하세요" />
          </div>

          <div className="modal-btns">
            <button type="button" className="btn-cancel" onClick={onClose}>취소</button>
            <button type="submit" className="btn-save">저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}
