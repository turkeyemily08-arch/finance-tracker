import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDefault = () => ({
  date: todayLocal(),
  type: 'expense',
  source: '용돈',
  category: '식비/외식',
  description: '',
  amount: '',
  // needsSettlement는 일부러 안 넣음: 공과금이면 자동으로 체크된 것처럼 보이되(effectiveNeedsSettlement),
  // 사용자가 직접 건드리기 전까지는 저장 시 필드 자체를 남기지 않아 utils.needsSettle()의 자동 판정에 맡김
});

export default function TransactionModal({ onClose, onSave, initial, prefillDate }) {
  // prefillDate: 캘린더에서 날짜를 클릭해 "새 거래"를 열 때만 사용 — 수정(initial)과는 별개
  const [form, setForm] = useState(() => initial || { ...getDefault(), ...(prefillDate ? { date: prefillDate } : {}) });

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const sourceOptions =
    form.type === 'expense'
      ? ['공과금', '용돈', '복지포인트', '기타']
      : ['급여', '정산', '복지포인트', '용돈', '기타'];

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
    if (!form.amount) return;
    const payload = {
      ...form,
      id: form.id || uuidv4(),
      amount: Number(String(form.amount).replace(/,/g, '')),
    };
    // 사용자가 체크박스를 직접 건드리지 않았으면 필드 자체를 저장하지 않음
    // → utils.needsSettle()의 "공과금은 자동 정산대상" 판정이 계속 적용됨
    if (payload.needsSettlement === undefined) delete payload.needsSettlement;
    onSave(payload);
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
            <label className="form-label">내용 (필수)</label>
            <input className="form-input" value={form.description || ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="가게명 등 자유 입력" required />
          </div>

          <div className="form-row">
            <label className="form-label">금액 (원)</label>
            <input className="form-input" type="number" value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0" min="0" required />
          </div>

          {form.type === 'expense' && form.source === '공과금' && (
            <div className="form-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#6B7280' }}>
                <input type="checkbox"
                  checked={form.selfPaid === true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((f) => {
                      if (checked) return { ...f, selfPaid: true, needsSettlement: false };
                      const next = { ...f, selfPaid: false };
                      delete next.needsSettlement;
                      return next;
                    });
                  }}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#B58BD0' }} />
                👛 본인부담 (정산 요청 안 하고 제가 낼게요)
              </label>
            </div>
          )}

          {form.type === 'expense' && !form.selfPaid && (() => {
            // 토스카드로 낸 교통비는 자동 체크 대상에서 제외 (개인 이동으로 보는 경우가 많음)
            const isTossTransitFare = form.source === '공과금' && form.category === '교통비' && form.paymentMethod === '토스카드';
            // 사용자가 체크박스를 아직 안 건드렸으면: 공과금은 자동 체크(단, 토스카드 교통비 제외), 그 외는 미체크
            const effectiveChecked = form.needsSettlement !== undefined
              ? form.needsSettlement
              : (form.source === '공과금' && !isTossTransitFare);
            return (
              <div className="form-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#374151' }}>
                  <input type="checkbox"
                    checked={effectiveChecked}
                    onChange={(e) => set('needsSettlement', e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#7C6FE8' }} />
                  🔖 정산 필요 (나중에 정산받을 지출)
                  {form.needsSettlement === undefined && form.source === '공과금' && !isTossTransitFare && (
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>(공과금은 자동 체크)</span>
                  )}
                  {isTossTransitFare && form.needsSettlement === undefined && (
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>(토스카드 교통비는 자동 제외)</span>
                  )}
                </label>
              </div>
            );
          })()}


          <div className="modal-btns">
            <button type="button" className="btn-cancel" onClick={onClose}>취소</button>
            <button type="submit" className="btn-save">저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}
