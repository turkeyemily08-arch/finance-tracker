import { useState, useEffect, useCallback } from 'react';
import SummaryCards from './components/SummaryCards';
import AllowancePanel from './components/AllowancePanel';
import Charts from './components/Charts';
import AdviceCard from './components/AdviceCard';
import TransactionTable from './components/TransactionTable';
import { filterByMonth, calcMonthStats } from './utils';
import './index.css';

const DATA_URL = import.meta.env.BASE_URL + 'data/transactions.json';
const LS_KEY = 'finance_tracker_data';

function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({ allowance: 150000, lastUpdated: '' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // 항상 서버 최신 데이터를 우선 로드 (localStorage는 오프라인 fallback용)
    fetch(DATA_URL + '?t=' + Date.now())
      .then((r) => r.json())
      .then((data) => {
        setTransactions(data.transactions || []);
        setSettings(data.settings || {});
        setLoaded(true);
        localStorage.setItem(LS_KEY, JSON.stringify(data));
      })
      .catch(() => {
        // 서버 실패 시 localStorage fallback
        const local = localStorage.getItem(LS_KEY);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setTransactions(parsed.transactions || []);
            setSettings(parsed.settings || {});
          } catch {}
        }
        setLoaded(true);
      });
  }, []);

  const persist = useCallback((txs, s = settings) => {
    const data = { settings: s, transactions: txs };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }, [settings]);

  const addTransaction = useCallback((tx) => {
    setTransactions((prev) => {
      const next = [...prev, tx];
      persist(next);
      return next;
    });
  }, [persist]);

  const updateTransaction = useCallback((tx) => {
    setTransactions((prev) => {
      const next = prev.map((t) => (t.id === tx.id ? tx : t));
      persist(next);
      return next;
    });
  }, [persist]);

  const deleteTransaction = useCallback((id) => {
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
        <div className="month-nav">
          <button onClick={prevMonth}>←</button>
          <span className="month-label">{year}년 {month}월</span>
          <button onClick={nextMonth}>→</button>
        </div>
      </div>

      <SummaryCards stats={stats} />

      <div className="grid-2">
        <AllowancePanel
          transactions={transactions}
          year={year}
          month={month}
          stats={stats}
        />
        <div className="gap-16" style={{ gap: 12 }}>
          <div className="grid-3" style={{ gap: 10 }}>
            <div className="stat-card">
              <div className="stat-label">저축률</div>
              <div className="stat-value" style={{ color: '#10B981' }}>
                {stats.income > 0 ? `${Math.max(0, Math.round(((stats.income - stats.expense) / stats.income) * 100))}%` : '0%'}
              </div>
              <div className="stat-sub">수입 대비</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">공과금 지출</div>
              <div className="stat-value" style={{ color: '#4F86C6', fontSize: 16 }}>
                {stats.공과금지출.toLocaleString()}
              </div>
              <div className="stat-sub">정산 대기 {stats.미정산 > 0 ? stats.미정산.toLocaleString() + '원' : '없음'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">거래 건수</div>
              <div className="stat-value">{monthTx.length}</div>
              <div className="stat-sub">
                수입 {monthTx.filter(t => t.type === 'income').length}건 / 지출 {monthTx.filter(t => t.type === 'expense').length}건
              </div>
            </div>
          </div>
          <div className="stat-card" style={{ textAlign: 'left', padding: '14px 18px' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>재원별 지출 현황</div>
            {[
              { label: '공과금', value: stats.공과금지출, color: '#4F86C6' },
              { label: '용돈', value: stats.용돈지출, color: '#E06666' },
              { label: '복지포인트', value: stats.복지포인트지출, color: '#8E7CC3' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>
                  {item.value > 0 ? item.value.toLocaleString() + '원' : '−'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Charts monthTx={monthTx} allTx={transactions} />

      <AdviceCard stats={stats} transactions={monthTx} year={year} month={month} />

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
