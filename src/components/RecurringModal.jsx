import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { pendingRecurringRules } from '../utils';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants';

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();
const dateFor = (year, month, day) => {
  const d = Math.min(day, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const getDefaultForm = () => ({
  type: 'expense',
  source: '용돈',
  category: '구독서비스',
  paymentMethod: '',
  amount: '',
  description: '',
  dayOfMonth: 1,
  active: true,
});

export default function RecurringModal({
  rules, allTransactions, year, month,
  onAddRule, onUpdateRule, onDeleteRule, onQuickAdd, onClose,
}) {
  const [form, setForm] = useState(null); // null = 목록 보기, 객체면 추가/수정 폼
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pending = pendingRecurringRules(rules, allTransactions, year, month);

  const sourceOptions = (type) => (type === 'income' ? ['급여', '정산', '복지포인트', '용돈', '기타'] : ['공과금', '용돈', '복지포인트', '저축', '기타']);
  const categoryOptions = (type, source) => (type === 'income' ? INCOME_CATEGORIES : (EXPENSE_CATEGORIES[source] || []));

  const startNew = () => setForm(getDefaultForm());
  const startEdit = (rule) => setForm(rule);

  const saveForm = (e) => {
    e.preventDefault();
    if (!form.amount || !form.description) return;
    const payload = { ...form, id: form.id || uuidv4(), amount: Number(String(form.amount).replace(/,/g, '')) };
    if (form.id) onUpdateRule(payload); else onAddRule(payload);
    setForm(null);
  };

  const btnBase = { fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer' };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(520px, 95vw)' }}>
        <div className="modal-title">🔁 반복거래</div>

        {!form && (
          <>
            {/* 이번달 대기중 */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
              {year}년 {month}월 대기중 {pending.length > 0 ? `(${pending.length}건)` : ''}
            </div>
            {pending.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>이번 달은 전부 추가됐어요 🎉</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {pending.map((r) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    padding: '8px 12px', borderRadius: 10, background: '#F1EFFB', border: '1px solid #DDD6F3',
                  }}>
                    <div style={{ fontSize: 13, color: '#1F2937' }}>
                      <b>{r.description}</b> <span style={{ color: '#6D5FD0', fontWeight: 700 }}>{r.amount.toLocaleString()}원</span>
                      <span style={{ color: '#9CA3AF', fontSize: 11 }}> · 매달 {r.dayOfMonth}일 · {r.source}</span>
                    </div>
                    <button
                      onClick={() => onQuickAdd(r, dateFor(year, month, r.dayOfMonth))}
                      style={{ ...btnBase, background: '#7C6FE8', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
                    >
                      + 추가
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 등록된 규칙 목록 */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>등록된 반복거래</div>
            {(!rules || rules.length === 0) ? (
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>아직 등록된 반복거래가 없어요</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, maxHeight: 220, overflowY: 'auto' }}>
                {rules.map((r) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    padding: '8px 12px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #EEF0F4',
                    opacity: r.active === false ? 0.5 : 1,
                  }}>
                    <div style={{ fontSize: 13, color: '#1F2937', cursor: 'pointer' }} onClick={() => startEdit(r)}>
                      <b>{r.description}</b> <span style={{ fontWeight: 700 }}>{r.amount.toLocaleString()}원</span>
                      <span style={{ color: '#9CA3AF', fontSize: 11 }}> · 매달 {r.dayOfMonth}일 · {r.source}/{r.category}{r.active === false ? ' (꺼짐)' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => onUpdateRule({ ...r, active: r.active === false })}
                        title={r.active === false ? '활성화' : '비활성화'}
                        style={{ ...btnBase, padding: '4px 8px' }}
                      >
                        {r.active === false ? '켜기' : '끄기'}
                      </button>
                      <button onClick={() => onDeleteRule(r.id)} className="delete-btn" title="삭제">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-btns">
              <button type="button" className="btn-cancel" onClick={onClose}>닫기</button>
              <button type="button" className="btn-save" onClick={startNew}>＋ 새 반복거래</button>
            </div>
          </>
        )}

        {form && (
          <form onSubmit={saveForm}>
            <div className="form-row-2" style={{ marginBottom: 14 }}>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label className="form-label">구분</label>
                <select className="form-select" value={form.type}
                  onChange={(e) => { const t = e.target.value; set('type', t); set('source', t === 'income' ? '급여' : '용돈'); }}>
                  <option value="expense">지출</option>
                  <option value="income">수입</option>
                </select>
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label className="form-label">매달 며칠</label>
                <input className="form-input" type="number" min="1" max="28" value={form.dayOfMonth}
                  onChange={(e) => set('dayOfMonth', Math.min(28, Math.max(1, Number(e.target.value) || 1)))} required />
              </div>
            </div>

            <div className="form-row-2" style={{ marginBottom: 14 }}>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label className="form-label">재원</label>
                <select className="form-select" value={form.source}
                  onChange={(e) => set('source', e.target.value)}>
                  {sourceOptions(form.type).map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label className="form-label">카테고리</label>
                <select className="form-select" value={form.category}
                  onChange={(e) => set('category', e.target.value)}>
                  {categoryOptions(form.type, form.source).map((c) => <option key={c}>{c}</option>)}
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
                placeholder="예: 적금" required />
            </div>

            <div className="form-row">
              <label className="form-label">금액 (원)</label>
              <input className="form-input" type="number" value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0" min="0" required />
            </div>

            <div className="modal-btns">
              <button type="button" className="btn-cancel" onClick={() => setForm(null)}>취소</button>
              <button type="submit" className="btn-save">저장</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
