import { useState, useEffect, useCallback, useRef } from 'react';
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
const AUTO_SAVE_DELAY = 10000; // 10 seconds debounce

// 원격(GitHub)과 브라우저(localStorage) 데이터를 id 기준으로 합칩니다.
// 한쪽에만 있는 거래는 절대 버리지 않고, 충돌 시 로컬(내가 마지막에 만진 값)을 우선합니다.
// → 깃에 아직 동기화 안 된 로컬 입력분이 배포 때 덮어써져 사라지는 일을 방지.
function mergeData(remote, local) {
  const remoteTx = (remote && remote.transactions) || [];
  const localTx = (local && local.transactions) || [];
  const byId = new Map();
  remoteTx.forEach((t) => byId.set(t.id, t));   // 원격을 먼저 깔고
  localTx.forEach((t) => byId.set(t.id, t));    // 로컬로 덮음(+ 로컬 전용 거래 보존)
  const transactions = Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
  const settings = (local && local.settings) || (remote && remote.settings) || {};
  return { settings, transactions };
}

function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({ allowance: 150000, lastUpdated: '' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let localData = null;
    try {
      const ls = localStorage.getItem(LS_KEY);
      if (ls) localData = JSON.parse(ls);
    } catch { localData = null; }

    fetch(DATA_URL + '?t=' + Date.now())
      .then((r) => r.json())
      .then((remote) => {
        const merged = mergeData(remote, localData);
        setTransactions(merged.transactions);
        setSettings(merged.settings);
        setLoaded(true);
        localStorage.setItem(LS_KEY, JSON.stringify(merged));
      })
      .catch(() => {
        if (localData) {
          setTransactions(localData.transactions || []);
          setSettings(localData.settings || {});
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

async function getGithubToken(silent = false) {
  let token = localStorage.getItem(LS_TOKEN_KEY);
  if (!token) {
    if (silent) return null;
    token = window.prompt(
      'GitHub Personal Access Token을 입력하세요.\n(Settings → Developer settings → Personal access tokens → Fine-grained tokens)\n권한: Contents = Read and write'
    );
    if (token) localStorage.setItem(LS_TOKEN_KEY, token.trim());
  }
  return token ? token.trim() : null;
}

async function saveToGithub(transactions, settings, silent = false) {
  const token = await getGithubToken(silent);
  if (!token) return { ok: false, msg: silent ? 'no-token' : '토큰 없음' };

  const apiBase = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

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
      message: silent ? `자동 저장 (${now})` : `데이터 저장 (${now})`,
      content: encoded,
      sha: meta.sha,
      branch: 'main',
    }),
  });

  if (!putRes.ok) return { ok: false, msg: `저장 실패 (${putRes.status})` };
  return { ok: true };
}

function copySettlementMessage(transactions, year, month) {
  const items = transactions
    .filter((t) => (t.memo || '').includes('정산필요'))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (items.length === 0) {
    alert('이번 달 정산필요 항목이 없습니다.');
    return;
  }

  const total = items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lines = items.map((t) => {
    const d = t.date.slice(5).replace('-', '/');
    const sign = t.type === 'expense' ? '' : '(환급) ';
    return `  ${d} ${sign}${t.description} ${t.amount.toLocaleString()}원`;
  });

  const msg = [
    `[정산 요청] ${year}년 ${month}월`,
    '─────────────────',
    ...lines,
    '─────────────────',
    `합계 ${total.toLocaleString()}원`,
  ].join('\n');

  navigator.clipboard.writeText(msg).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = msg;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
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

  // Refs to always have the latest values inside async callbacks
  const txRef = useRef(transactions);
  const settingsRef = useRef(settings);
  const savingRef = useRef(saving);
  const autoSaveTimer = useRef(null);
  const initialLoad = useRef(true);

  useEffect(() => { txRef.current = transactions; }, [transactions]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { savingRef.current = saving; }, [saving]);

  const showMsg = useCallback((msg, duration = 4000) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), duration);
  }, []);

  // Debounced auto-save — fires 10s after the last change, only if token is stored
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveMsg('● 저장 대기 중…');
    autoSaveTimer.current = setTimeout(async () => {
      if (savingRef.current) return;
      const hasToken = !!localStorage.getItem(LS_TOKEN_KEY);
      if (!hasToken) {
        setSaveMsg('');
        return;
      }
      setSaving(true);
      setSaveMsg('');
      const result = await saveToGithub(txRef.current, settingsRef.current, true);
      setSaving(false);
      if (result.ok) {
        showMsg('✅ 자동 저장 완료');
      } else if (result.msg !== 'no-token') {
        showMsg(`❌ 자동 저장 실패: ${result.msg}`);
      }
    }, AUTO_SAVE_DELAY);
  }, [showMsg]);

  // Watch for transaction changes after initial load
  useEffect(() => {
    if (!loaded) return;
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }
    scheduleAutoSave();
  }, [transactions, loaded, scheduleAutoSave]);

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
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaving(true);
    setSaveMsg('');
    const result = await saveToGithub(transactions, settings);
    setSaving(false);
    if (result.ok) {
      showMsg('✅ 저장 완료! 약 1분 후 반영됩니다.', 5000);
    } else {
      showMsg(`❌ ${result.msg}`, 5000);
    }
  };

  const handleBackup = () => downloadBackup(transactions, settings);

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#6B7280' }}>
        로딩 중...
      </div>
    );
  }

  const isPending = saveMsg === '● 저장 대기 중…';
  const saveMsgColor = saveMsg.startsWith('✅') ? '#5BADA0' : saveMsg.startsWith('❌') ? '#E08090' : '#9CA3AF';

  return (
    <div className="gap-16">
      <div className="app-header">
        <div className="app-title">My Finance Tracker</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {saveMsg && (
            <span style={{ fontSize: 12, color: saveMsgColor }}>
              {saveMsg}
            </span>
          )}
          <button
            className="header-btn kakao-btn"
            onClick={() => copySettlementMessage(monthTx, year, month)}
            title="정산필요 항목을 카카오톡 메시지로 복사"
          >
            📋 정산요청
          </button>
          <button className="header-btn backup-btn" onClick={handleBackup} title="JSON 파일로 백업">
            ⬇ 백업
          </button>
          <button
            className="header-btn save-btn"
            onClick={handleSave}
            disabled={saving}
            title="GitHub에 저장 (자동 배포)"
          >
            {saving ? '저장 중…' : isPending ? '☁ 지금 저장' : '☁ 저장'}
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
            {['신한카드', '삼성카드'].map((card) => {
              const spent = monthTx
                .filter((t) => t.type === 'expense' && t.paymentMethod === card)
                .reduce((s, t) => s + t.amount, 0);
              const achieved = spent >= 300000;
              return (
                <div className="stat-card" key={card}>
                  <div className="stat-label">{card} 실적</div>
                  <div className="stat-value" style={{ color: achieved ? '#5FC0A0' : '#6FB0E0', fontSize: 16 }}>
                    {achieved ? '✅ 달성' : `${Math.round(spent / 10000)}만원`}
                  </div>
                  <div className="stat-sub">
                    {achieved ? `${spent.toLocaleString()}원` : `${(300000 - spent).toLocaleString()}원 남음`}
                  </div>
                </div>
              );
            })}
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
              { label: '공과금', value: stats.공과금지출, color: '#6FB0E0' },
              { label: '용돈', value: stats.용돈지출, color: '#F088AC' },
              { label: '복지포인트', value: stats.복지포인트지출, color: '#B088D8' },
              { label: '교통비', value: stats.교통비지출, color: '#6CB4E0' },
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
