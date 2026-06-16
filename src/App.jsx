import { useState, useEffect, useCallback } from 'react';
import SummaryCards from './components/SummaryCards';
import AllowancePanel from './components/AllowancePanel';
import Charts from './components/Charts';
import AdviceCard, { NextMonthCard } from './components/AdviceCard';
import TransactionTable from './components/TransactionTable';
import { CopyButtons } from './components/ExtraWidgets';
import { filterByMonth, calcMonthStats } from './utils';
import './index.css';

const DATA_URL = import.meta.env.BASE_URL + 'data/transactions.json';
const LS_KEY = 'finance_tracker_data';
const PATCHES_KEY = 'finance_tracker_patches';   // 서버 거래 수정 내용
const ADDITIONS_KEY = 'finance_tracker_additions'; // 사용자가 UI로 추가한 거래
const DELETIONS_KEY = 'finance_tracker_deletions'; // 사용자가 삭제한 서버 거래 ID 목록

function getPatches() {
  try { return JSON.parse(localStorage.getItem(PATCHES_KEY) || '{}'); } catch { return {}; }
}
function savePatch(tx) {
  const p = getPatches(); p[tx.id] = tx;
  localStorage.setItem(PATCHES_KEY, JSON.stringify(p));
}
function removePatch(id) {
  const p = getPatches(); delete p[id];
  localStorage.setItem(PATCHES_KEY, JSON.stringify(p));
}

function getAdditions() {
  try { return JSON.parse(localStorage.getItem(ADDITIONS_KEY) || '[]'); } catch { return []; }
}
function saveAddition(tx) {
  const adds = getAdditions();
  const idx = adds.findIndex((a) => a.id === tx.id);
  if (idx >= 0) adds[idx] = tx; else adds.push(tx);
  localStorage.setItem(ADDITIONS_KEY, JSON.stringify(adds));
}
function removeAddition(id) {
  localStorage.setItem(ADDITIONS_KEY, JSON.stringify(getAdditions().filter((a) => a.id !== id)));
}

function getDeletions() {
  try { return new Set(JSON.parse(localStorage.getItem(DELETIONS_KEY) || '[]')); } catch { return new Set(); }
}
function saveDeletion(id) {
  const d = getDeletions(); d.add(id);
  localStorage.setItem(DELETIONS_KEY, JSON.stringify([...d]));
}

// 서버 데이터 + 사용자 수정(patches) + 사용자 추가(additions) - 사용자 삭제(deletions) 병합
function mergeAll(serverTransactions) {
  const patches = getPatches();
  const additions = getAdditions();
  const deletions = getDeletions();
  const serverIds = new Set(serverTransactions.map((t) => t.id));

  const merged = serverTransactions
    .filter((t) => !deletions.has(t.id))
    .map((t) => patches[t.id] ? { ...t, ...patches[t.id] } : t);

  additions
    .filter((t) => !serverIds.has(t.id) && !deletions.has(t.id))
    .forEach((t) => merged.push(t));

  return merged;
}

function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({ allowance: 150000, lastUpdated: '' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(DATA_URL + '?t=' + Date.now())
      .then((r) => r.json())
      .then((data) => {
        const merged = mergeAll(data.transactions || []);
        setTransactions(merged);
        setSettings(data.settings || {});
        setLoaded(true);
        localStorage.setItem(LS_KEY, JSON.stringify(data));
      })
      .catch(() => {
        const local = localStorage.getItem(LS_KEY);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setTransactions(mergeAll(parsed.transactions || []));
            setSettings(parsed.settings || {});
          } catch {}
        }
        setLoaded(true);
      });
  }, []);

  const persist = useCallback((txs, s = settings) => {
    localStorage.setItem(LS_KEY, JSON.stringify({ settings: s, transactions: txs }));
  }, [settings]);

  const addTransaction = useCallback((tx) => {
    saveAddition(tx); // 로컬에 영구 보존 → 서버 재배포 후에도 유지
    setTransactions((prev) => {
      const next = [...prev, tx];
      persist(next);
      return next;
    });
  }, [persist]);

  const updateTransaction = useCallback((tx) => {
    const isUserAdded = getAdditions().some((a) => a.id === tx.id);
    if (isUserAdded) saveAddition(tx); else savePatch(tx);
    setTransactions((prev) => {
      const next = prev.map((t) => (t.id === tx.id ? tx : t));
      persist(next);
      return next;
    });
  }, [persist]);

  const deleteTransaction = useCallback((id) => {
    const isUserAdded = getAdditions().some((a) => a.id === id);
    if (isUserAdded) removeAddition(id); else { saveDeletion(id); removePatch(id); }
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  return { transactions, settings, loaded, addTransaction, updateTransaction, deleteTransaction };
}

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { transactions, settings, loaded, addTransaction, updateTransaction, deleteTransaction } =
    useTransactions();

  const monthTx = filterByMonth(transactions, year, month);
  const stats = calcMonthStats(monthTx);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#6B7280' }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div className="gap-16">
      <div className="app-header">
        <div className="app-title">My Finance Tracker</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <CopyButtons transactions={monthTx} stats={stats} year={year} month={month} />
          <div className="month-nav">
            <button onClick={prevMonth}>←</button>
            <span className="month-label">{year}년 {month}월</span>
            <button onClick={nextMonth}>→</button>
          </div>
        </div>
      </div>

      <SummaryCards stats={stats} welfareBalance={settings.welfarePointsBalance || 0} />

      <div className="grid-2">
        <AllowancePanel
          transactions={transactions}
          year={year}
          month={month}
          stats={stats}
        />
        <div className="gap-16" style={{ gap: 12 }}>
          {/* 카드 실적 2칸 + 거래건수 1칸 */}
          <div className="grid-3" style={{ gap: 10 }}>
            {['신한카드', '삼성카드'].map((cardName) => {
              const spent = monthTx
                .filter(t => t.type === 'expense' && t.paymentMethod === cardName)
                .reduce((s, t) => s + t.amount, 0);
              const done = spent >= 300000;
              return (
                <div className="stat-card" key={cardName}>
                  <div className="stat-label">{cardName}</div>
                  <div className="stat-value" style={{ color: done ? '#10B981' : '#60A5FA', fontSize: 15 }}>
                    {done ? '✅ 달성' : `${Math.round(spent / 10000)}만원`}
                  </div>
                  <div className="stat-sub">
                    {done
                      ? `${spent.toLocaleString()}원`
                      : `${(300000 - spent).toLocaleString()}원 남음`}
                  </div>
                </div>
              );
            })}
            <div className="stat-card">
              <div className="stat-label">거래 건수</div>
              <div className="stat-value">{monthTx.length}</div>
              <div className="stat-sub">
                수입 {monthTx.filter(t => t.type === 'income' && t.source !== '정산').length}건 / 지출 {monthTx.filter(t => t.type === 'expense').length}건
              </div>
            </div>
          </div>

          {/* 재원별 지출 현황 */}
          <div className="stat-card" style={{ textAlign: 'left', padding: '14px 18px' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>재원별 지출 현황</div>
            {[
              { label: '공과금', value: stats.공과금지출, color: '#4F86C6' },
              { label: '용돈', value: stats.용돈지출, color: '#E06666' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>
                  {item.value > 0 ? item.value.toLocaleString() + '원' : '−'}
                </span>
              </div>
            ))}
            {/* 복지포인트: 지출 대신 잔액 표시 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8E7CC3', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>복지포인트</span>
              <span style={{ fontSize: 11, color: '#9CA3AF', marginRight: 4 }}>잔액</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8E7CC3' }}>
                {(settings.welfarePointsBalance || 0).toLocaleString()}원
              </span>
            </div>
            {stats.교통비지출 > 0 && stats.미정산 > 0 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11 }}>🚌</span>
                <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>교통비 합계 <span style={{ color: '#9CA3AF', fontSize: 11 }}>(정산 청구용)</span></span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4F86C6' }}>{stats.교통비지출.toLocaleString()}원</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Charts monthTx={monthTx} allTx={transactions} />

      {/* 소비 조언 + 다음달 예측 나란히 */}
      <div className="grid-2">
        <AdviceCard stats={stats} transactions={monthTx} year={year} month={month} />
        <NextMonthCard allTransactions={transactions} year={year} month={month} />
      </div>

      <TransactionTable
        transactions={monthTx}
        onAdd={addTransaction}
        onUpdate={updateTransaction}
        onDelete={deleteTransaction}
      />

      <div className="app-footer">
        Powered by Claude · 마지막 업데이트: {settings.lastUpdated || '−'}
      </div>
    </div>
  );
}
