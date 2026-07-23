import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import SummaryCards from './components/SummaryCards';
import AllowancePanel from './components/AllowancePanel';
import Charts from './components/Charts';
import AdviceCard, { NextMonthCard } from './components/AdviceCard';
import TransactionTable from './components/TransactionTable';
import SettlementAlert from './components/SettlementAlert';
import SettlementListModal from './components/SettlementListModal';
import { CopyButtons } from './components/ExtraWidgets';
import { filterByMonth, calcMonthStats, calcSettlementAlerts } from './utils';
import './index.css';

const DATA_URL = import.meta.env.BASE_URL + 'data/transactions.json';
const LS_KEY = 'finance_tracker_data'; // 서버 기본 데이터(승인본) 오프라인 캐시
const OVERLAY_CACHE_KEY = 'finance_tracker_overlay_cache'; // Firestore 오버레이 로컬 캐시(오프라인 대비)

// Firestore 도입 전 localStorage 키 — 이 기기에 남아있던 편집 내역을 최초 1회만 이관하는 용도
const LEGACY_PATCHES_KEY = 'finance_tracker_patches';
const LEGACY_ADDITIONS_KEY = 'finance_tracker_additions';
const LEGACY_DELETIONS_KEY = 'finance_tracker_deletions';

function readLegacyOverlay() {
  const patches = (() => { try { return JSON.parse(localStorage.getItem(LEGACY_PATCHES_KEY) || '{}'); } catch { return {}; } })();
  const additions = (() => { try { return JSON.parse(localStorage.getItem(LEGACY_ADDITIONS_KEY) || '[]'); } catch { return []; } })();
  const deletions = (() => { try { return JSON.parse(localStorage.getItem(LEGACY_DELETIONS_KEY) || '[]'); } catch { return []; } })();
  return { patches, additions, deletions };
}

const EMPTY_OVERLAY = { patches: {}, additions: [], deletions: [] };
// 규리님 가계부 전용 문서 하나에 수정/추가/삭제 내역을 저장 → 실시간 구독으로 기기 간 자동 반영
const OVERLAY_DOC = doc(db, 'households', 'kyuri');

// 메모를 내용(description)으로 합치기: 둘 다 있으면 "내용 (메모)", 합친 뒤 memo는 비움
function mergeMemoIntoDesc(t) {
  const memo = (t.memo || '').trim();
  if (!memo) return t;
  const desc = (t.description || '').trim();
  const merged = desc ? `${desc} (${memo})` : memo;
  return { ...t, description: merged, memo: '' };
}

// 서버 데이터(승인본) + 오버레이(수정/추가/삭제) 병합
function mergeAll(serverTransactions, overlay) {
  const { patches = {}, additions = [], deletions = [] } = overlay || EMPTY_OVERLAY;
  const deletionSet = new Set(deletions);
  const serverIds = new Set(serverTransactions.map((t) => t.id));

  const merged = serverTransactions
    .filter((t) => !deletionSet.has(t.id))
    .map((t) => (patches[t.id] ? { ...t, ...patches[t.id] } : t));

  additions
    .filter((t) => !serverIds.has(t.id) && !deletionSet.has(t.id))
    .forEach((t) => merged.push(t));

  return merged.map(mergeMemoIntoDesc);
}

function useTransactions() {
  const [serverTx, setServerTx] = useState(null); // null = 아직 안 옴
  const [settings, setSettings] = useState({ allowance: 150000, lastUpdated: '' });
  const [overlay, setOverlay] = useState(EMPTY_OVERLAY);
  const [baseLoaded, setBaseLoaded] = useState(false);
  const [overlayLoaded, setOverlayLoaded] = useState(false);

  const writeTimer = useRef(null);
  const pendingOverlay = useRef(null);
  const migratedRef = useRef(false);

  // 1) 서버 기본 데이터(승인본) 로드 — 기존과 동일
  useEffect(() => {
    fetch(DATA_URL + '?t=' + Date.now())
      .then((r) => r.json())
      .then((data) => {
        setServerTx(data.transactions || []);
        setSettings(data.settings || {});
        setBaseLoaded(true);
        localStorage.setItem(LS_KEY, JSON.stringify(data));
      })
      .catch(() => {
        const local = localStorage.getItem(LS_KEY);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setServerTx(parsed.transactions || []);
            setSettings(parsed.settings || {});
          } catch { setServerTx([]); }
        } else {
          setServerTx([]);
        }
        setBaseLoaded(true);
      });
  }, []);

  // 2) Firestore 오버레이 실시간 구독 — 폰/PC 어디서 수정하든 몇 초 안에 서로 반영됨
  useEffect(() => {
    const unsub = onSnapshot(
      OVERLAY_DOC,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const next = {
            patches: data.patches || {},
            additions: data.additions || [],
            deletions: data.deletions || [],
          };
          setOverlay(next);
          localStorage.setItem(OVERLAY_CACHE_KEY, JSON.stringify(next));
        } else if (!migratedRef.current) {
          // 최초 1회: 이 기기에 남아있던 로컬(localStorage) 편집 내역을 Firestore로 이관
          migratedRef.current = true;
          const legacy = readLegacyOverlay();
          setOverlay(legacy);
          localStorage.setItem(OVERLAY_CACHE_KEY, JSON.stringify(legacy));
          await setDoc(OVERLAY_DOC, legacy).catch(() => {});
        }
        setOverlayLoaded(true);
      },
      () => {
        // 오프라인 등으로 구독 실패 시 마지막 캐시로 대체
        const cached = localStorage.getItem(OVERLAY_CACHE_KEY);
        if (cached) {
          try { setOverlay(JSON.parse(cached)); } catch { setOverlay(readLegacyOverlay()); }
        } else {
          setOverlay(readLegacyOverlay());
        }
        setOverlayLoaded(true);
      }
    );
    return unsub;
  }, []);

  // 네트워크가 완전히 막혀 onSnapshot이 응답도 에러도 못 낼 때를 대비한 안전장치
  useEffect(() => {
    const timer = setTimeout(() => {
      setOverlayLoaded((prev) => {
        if (prev) return prev;
        const cached = localStorage.getItem(OVERLAY_CACHE_KEY);
        if (cached) { try { setOverlay(JSON.parse(cached)); } catch { /* 캐시 파싱 실패 시 기본값 유지 */ } }
        return true;
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Firestore 쓰기는 400ms 디바운스 — 메모/내용 입력처럼 매 키 입력마다 onUpdate가 호출돼도
  // 네트워크 요청을 과도하게 보내지 않고, 화면은 즉시(낙관적) 갱신됨
  const scheduleWrite = useCallback((next) => {
    pendingOverlay.current = next;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      setDoc(OVERLAY_DOC, pendingOverlay.current).catch(() => {});
    }, 400);
  }, []);

  const transactions = useMemo(
    () => (serverTx === null ? [] : mergeAll(serverTx, overlay)),
    [serverTx, overlay]
  );

  const addTransaction = useCallback((tx) => {
    setOverlay((prev) => {
      const next = { ...prev, additions: [...prev.additions, tx] };
      scheduleWrite(next);
      return next;
    });
  }, [scheduleWrite]);

  const updateTransaction = useCallback((tx) => {
    setOverlay((prev) => {
      const isUserAdded = prev.additions.some((a) => a.id === tx.id);
      const next = isUserAdded
        ? { ...prev, additions: prev.additions.map((a) => (a.id === tx.id ? tx : a)) }
        : { ...prev, patches: { ...prev.patches, [tx.id]: tx } };
      scheduleWrite(next);
      return next;
    });
  }, [scheduleWrite]);

  const deleteTransaction = useCallback((id) => {
    setOverlay((prev) => {
      const isUserAdded = prev.additions.some((a) => a.id === id);
      let next;
      if (isUserAdded) {
        next = { ...prev, additions: prev.additions.filter((a) => a.id !== id) };
      } else {
        const patches = { ...prev.patches };
        delete patches[id];
        next = { ...prev, patches, deletions: [...new Set([...prev.deletions, id])] };
      }
      scheduleWrite(next);
      return next;
    });
  }, [scheduleWrite]);

  return {
    transactions,
    settings,
    loaded: baseLoaded && overlayLoaded,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { transactions, settings, loaded, addTransaction, updateTransaction, deleteTransaction } =
    useTransactions();

  const monthTx = filterByMonth(transactions, year, month);
  const stats = calcMonthStats(monthTx);

  // "이번달 정산완료" 버튼: 넘겨받은 id들을 정산완료(needsSettlement:false)로 일괄 처리
  const settleTransactions = useCallback((ids) => {
    ids.forEach((id) => {
      const tx = transactions.find((t) => t.id === id);
      if (tx) updateTransaction({ ...tx, needsSettlement: false });
    });
  }, [transactions, updateTransaction]);

  // 정산 알림 배너 클릭 → 전체 정산대기 목록 모달
  const [showSettlementList, setShowSettlementList] = useState(false);
  const settlementAlerts = calcSettlementAlerts(transactions);

  // 카테고리 차트 막대 클릭 → 거래내역 검색창에 해당 카테고리를 채워 즉시 필터링 + 스크롤 이동
  const [categoryFilterSignal, setCategoryFilterSignal] = useState(null); // { term, nonce }
  const handleCategoryClick = useCallback((name) => {
    if (!name) return;
    setCategoryFilterSignal({ term: name, nonce: Date.now() });
    requestAnimationFrame(() => {
      document.getElementById('tx-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

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
          <CopyButtons transactions={monthTx} stats={stats} year={year} month={month} onSettleAll={settleTransactions} />
          <div className="month-nav">
            <button onClick={prevMonth}>←</button>
            <span className="month-label">{year}년 {month}월</span>
            <button onClick={nextMonth}>→</button>
          </div>
        </div>
      </div>

      <SettlementAlert allTransactions={transactions} onOpenAll={() => setShowSettlementList(true)} />
      {showSettlementList && (
        <SettlementListModal
          items={settlementAlerts.items}
          total={settlementAlerts.total}
          onClose={() => setShowSettlementList(false)}
          onSettle={(id) => settleTransactions([id])}
        />
      )}

      <div className="main-grid">
        <div className="main-left">
      <SummaryCards stats={stats} welfareBalance={settings.welfarePointsBalance || 0} />

      <div className="grid-2">
        <AllowancePanel
          transactions={transactions}
          year={year}
          month={month}
          stats={stats}
        />
        <div className="gap-16" style={{ gap: 12 }}>
          {/* 카드 실적 1칸 + 거래건수 1칸 (신한카드 해지로 제거) */}
          <div className="grid-2" style={{ gap: 10 }}>
            {['삼성카드'].map((cardName) => {
              const spent = monthTx
                .filter(t => t.type === 'expense' && t.paymentMethod === cardName)
                .reduce((s, t) => s + t.amount, 0);
              const done = spent >= 300000;
              return (
                <div className="stat-card" key={cardName}>
                  <div className="stat-label">{cardName}</div>
                  <div className="stat-value" style={{ color: done ? '#3DAA71' : '#A78BFA', fontSize: 15 }}>
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
              { label: '공과금', value: stats.공과금지출, color: '#7C6FE8' },
              { label: '용돈', value: stats.용돈지출, color: '#C2568C' },
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
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9D8CF0', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>복지포인트</span>
              <span style={{ fontSize: 11, color: '#9CA3AF', marginRight: 4 }}>잔액</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#9D8CF0' }}>
                {(settings.welfarePointsBalance || 0).toLocaleString()}원
              </span>
            </div>
            {stats.교통비지출 > 0 && stats.미정산 > 0 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11 }}>🚌</span>
                <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>교통비 합계 <span style={{ color: '#9CA3AF', fontSize: 11 }}>(정산 청구용)</span></span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#7C6FE8' }}>{stats.교통비지출.toLocaleString()}원</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Charts monthTx={monthTx} allTx={transactions} onCategoryClick={handleCategoryClick} />

      {/* 소비 조언 + 다음달 예측 나란히 */}
      <div className="grid-2">
        <AdviceCard stats={stats} transactions={monthTx} year={year} month={month} />
        <NextMonthCard allTransactions={transactions} year={year} month={month} />
      </div>
        </div>

        <div className="main-right" id="tx-section">
          <TransactionTable
            transactions={monthTx}
            onAdd={addTransaction}
            onUpdate={updateTransaction}
            onDelete={deleteTransaction}
            externalSearch={categoryFilterSignal}
          />
        </div>
      </div>

      <div className="app-footer">
        Powered by Claude · 마지막 업데이트: {settings.lastUpdated || '−'}
      </div>
    </div>
  );
}
