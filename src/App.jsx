import { useState, useEffect, useCallback } from 'react';
import SummaryCards from './components/SummaryCards';
import AllowancePanel from './components/AllowancePanel';
import Charts from './components/Charts';
import AdviceCard from './components/AdviceCard';
import TransactionTable from './components/TransactionTable';
import { filterByMonth, calcMonthStats } from './utils';
import './index.css';

const REPO_OWNER = 'turkeyemily08-arch';
const REPO_NAME = 'finance-tracker';
const FILE_PATH = 'public/data/transactions.json';
const DATA_URL = import.meta.env.BASE_URL + 'data/transactions.json';
const LS_KEY = 'finance_tracker_data';
const LS_TOKEN_KEY = 'gh_pat';

function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({ allowance: 150000, lastUpdated: '' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(DATA_URL + '?t=' + Date.now())
      .then((r) => r.json())
      .then((data) => {
        setTransactions(data.transactions || []);
        setSettings(data.settings || {});
        setLoaded(true);
        localStorage.setItem(LS_KEY, JSON.stringify(data));
      })
      .catch(() => {
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

async function getGithubToken() {
  let token = localStorage.getItem(LS_TOKEN_KEY);
  if (!token) {
    token = window.prompt(
      'GitHub Personal Access Token을 입력하세요.\n(Settings → Developer settings → Personal access tokens → Fine-grained tokens)\n권한: Contents = Read and write'
    );
    if (token) localStorage.setItem(LS_TOKEN_KEY, token.trim());
  }
  return token ? token.trim() : null;
}

async function saveToGithub(transactions, settings) {
  const token = await getGithubToken();
  if (!token) return { ok: false, msg: '토큰 없음' };

  const apiBase = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

  // 현재 파일 SHA 가져오기
  const metaRes = await fetch(apiBase + '?ref=main', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!metaRes.ok) {
    if (metaRes.status === 401) localStorage.removeItem(LS_TOKEN_KEY);
    return { ok: false, msg: `GitHub 인증 실패 (${metaRes.status})` };
  }
  const meta = await metaRes.json();

  const now = new Date().toISOString().slice(0, 10);
  const payload = { settings: { ...settings, lastUpdated: now }, transactions };
  const json = JSON.stringify(payload, null, 2);
  const encoded = btoa(unescape(encodeURIComponent(json)));

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `데이터 저장 (${now})`,
      content: encoded,
      sha: meta.sha,
      branch: 'main',
    }),
  });

  if (!putRes.ok) return { ok: false, msg: `저장 실패 (${putRes.status})` };
  return { ok: true };
}

function downloadBackup(transactions, settings) {
  const now = new Date().toISOString().slice(0, 10);
  const data = JSON.stringify({ settings, transactions }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance-backup-${now}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

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

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    const result = await saveToGithub(transactions, settings);
    setSaving(false);
    if (result.ok) {
      setSaveMsg('✅ 저장 완료! 약 1분 후 반영됩니다.');
    } else {
      setSaveMsg(`❌ ${result.msg}`);
    }
    setTimeout(() => setSaveMsg(''), 5000);
  };

  const handleBackup = () => downloadBackup(transactions, settings);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {saveMsg && (
            <span style={{ fontSize: 12, color: saveMsg.startsWith('✅') ? '#10B981' : '#E06666' }}>
              {saveMsg}
            </span>
          )}
          <button className="header-btn backup-btn" onClick={handleBackup} title="JSON 파일로 백업">
            ⬇ 백업
          </button>
          <button
            className="header-btn save-btn"
            onClick={handleSave}
            disabled={saving}
            title="GitHub에 저장 (자동 배포)"
          >
            {saving ? '저장 중…' : '☁ 저장'}
          </button>
          <div className="month-nav">
            <button onClick={prevMonth}>←</button>
            <span className="month-label">{year}년 {month}월</span>
            <button onClick={nextMonth}>→</button>
          </div>
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
              <div className="stat-value" style={{ color: '#60A5FA', fontSize: 16 }}>
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
              { label: '공과금', value: stats.공과금지출, color: '#60A5FA' },
              { label: '용돈', value: stats.용돈지출, color: '#F87171' },
              { label: '복지포인트', value: stats.복지포인트지출, color: '#C084FC' },
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
