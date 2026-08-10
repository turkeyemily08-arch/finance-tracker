import { ALLOWANCE, WELFARE_BASELINE_DATE } from './constants';

export const formatKRW = (amount) =>
  `₩${Math.abs(amount).toLocaleString('ko-KR')}`;

export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

export const getMonthKey = (dateStr) => dateStr.slice(0, 7);

export const filterByMonth = (transactions, year, month) => {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  return transactions.filter((t) => t.date.startsWith(key));
};

// 반복거래 규칙(적금 등)이 특정 월에 이미 추가됐는지 확인.
// 생성된 거래는 recurringId로 규칙과 연결돼있어서, 같은 규칙을 그 달에 두 번 추가하는 걸 막아줌.
export const isRuleAppliedForMonth = (rule, allTransactions, year, month) => {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  return allTransactions.some((t) => t.recurringId === rule.id && t.date.startsWith(key));
};

// 활성화된 규칙 중, 보고 있는 달에 아직 추가 안 된 것들만 골라줌
export const pendingRecurringRules = (rules, allTransactions, year, month) =>
  (rules || [])
    .filter((r) => r.active !== false)
    .filter((r) => !isRuleAppliedForMonth(r, allTransactions, year, month));

export const calcMonthStats = (transactions) => {
  // 정산은 남편 공동저축 계좌이체이므로 수입으로 집계하지 않음
  const income = transactions
    .filter((t) => t.type === 'income' && t.source !== '정산')
    .reduce((s, t) => s + t.amount, 0);
  // 저축(적금 등) 이체는 소비가 아니라 돈을 옮겨두는 것뿐이라 지출 합계에서 제외.
  // 대신 실제 저축액(저축지출)으로 따로 집계해서 "이번 달 저축"에 반영함.
  const expense = transactions
    .filter((t) => t.type === 'expense' && t.source !== '저축')
    .reduce((s, t) => s + t.amount, 0);
  const 저축지출 = transactions
    .filter((t) => t.type === 'expense' && t.source === '저축')
    .reduce((s, t) => s + t.amount, 0);
  const 공과금지출 = transactions
    .filter((t) => t.type === 'expense' && t.source === '공과금')
    .reduce((s, t) => s + t.amount, 0);
  const 정산수입 = transactions
    .filter((t) => t.source === '정산')
    .reduce((s, t) => s + t.amount, 0);
  const 공과금정산수입 = transactions
    .filter((t) => t.source === '정산' && t.category === '공과금 정산')
    .reduce((s, t) => s + t.amount, 0);
  const 교통비지출 = transactions
    .filter((t) => t.type === 'expense' && t.source === '공과금' && t.category === '교통비')
    .reduce((s, t) => s + t.amount, 0);
  const 용돈지출 = transactions
    .filter((t) => t.type === 'expense' && t.source === '용돈')
    .reduce((s, t) => s + t.amount, 0);
  const 복지포인트지출 = transactions
    .filter((t) => t.type === 'expense' && t.source === '복지포인트')
    .reduce((s, t) => s + t.amount, 0);
  const 급여 = transactions
    .filter((t) => t.source === '급여')
    .reduce((s, t) => s + t.amount, 0);

  return {
    income,
    expense,
    저축지출,
    공과금지출,
    정산수입,
    용돈지출,
    복지포인트지출,
    급여,
    교통비지출,
    미정산: 공과금지출 - 공과금정산수입,
    용돈잔액: ALLOWANCE - 용돈지출,
  };
};

// 복지포인트 잔액: settings에 저장된 값은 기준일(WELFARE_BASELINE_DATE) 시점 잔액.
// 그 이후 '복지카드'로 결제한 지출은 자동으로 차감해서 보여줌(수기로 잔액을 매번 안 고쳐도 되게).
export const calcWelfareBalance = (settings, allTransactions) => {
  const base = settings.welfarePointsBalance || 0;
  const spent = allTransactions
    .filter((t) => t.type === 'expense' && t.paymentMethod === '복지카드' && t.date >= WELFARE_BASELINE_DATE)
    .reduce((s, t) => s + t.amount, 0);
  return Math.max(0, base - spent);
};

export const calcDailyAllowanceBalance = (transactions, year, month) => {
  const monthTx = filterByMonth(transactions, year, month)
    .filter((t) => t.type === 'expense' && t.source === '용돈')
    .sort((a, b) => a.date.localeCompare(b.date));

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;

  const result = [];
  let balance = ALLOWANCE;
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayExpense = monthTx
      .filter((t) => t.date === dateStr)
      .reduce((s, t) => s + t.amount, 0);
    balance -= dayExpense;
    result.push({ day: `${d}일`, balance: Math.max(balance, 0) });
  }
  return result;
};

export const calcMonthlyTrend = (transactions) => {
  const map = {};
  transactions.forEach((t) => {
    const key = getMonthKey(t.date);
    if (!map[key]) map[key] = { month: key, income: 0, expense: 0, saving: 0 };
    // 정산은 계좌이체이므로 수입으로 집계하지 않음
    if (t.type === 'income' && t.source !== '정산') map[key].income += t.amount;
    // 저축 이체는 소비가 아니므로 지출에서 빼고 저축으로 따로 집계
    else if (t.type === 'expense' && t.source === '저축') map[key].saving += t.amount;
    else if (t.type === 'expense') map[key].expense += t.amount;
  });
  return Object.values(map)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      month: m.month.slice(5) + '월',
      수입: m.income,
      지출: m.expense,
      저축: m.saving,
    }));
};

export const calcDailyPublicBillBalance = (transactions, year, month) => {
  const monthTx = filterByMonth(transactions, year, month).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;

  const result = [];
  let balance = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const expense = monthTx
      .filter((t) => t.date === dateStr && t.type === 'expense' && t.source === '공과금')
      .reduce((s, t) => s + t.amount, 0);
    const settled = monthTx
      .filter((t) => t.date === dateStr && t.source === '정산' && t.category === '공과금 정산')
      .reduce((s, t) => s + t.amount, 0);
    balance = balance - expense + settled;
    result.push({ day: `${d}일`, balance });
  }
  return result;
};

export const calcPaymentBreakdown = (transactions) => {
  const map = {};
  transactions
    .filter((t) => t.type === 'expense' && t.paymentMethod)
    .forEach((t) => {
      const key = t.paymentMethod || '기타';
      map[key] = (map[key] || 0) + t.amount;
    });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

// 이 날짜부터는 공과금 지출을 체크박스 없이도 자동으로 정산 대상으로 간주함.
// 그 이전 과거 데이터는 명시적 체크(needsSettlement) 또는 "정산필요" 문자열이 있을 때만 대상으로 유지(167건 호환).
export const SETTLEMENT_BASELINE_DATE = '2026-07-06';

// 정산 요청 없이 본인이 부담하기로 한 지출인지 (t.selfPaid === true)
export const isSelfPaid = (t) => t.selfPaid === true;

// 자동판정에서 예외로 둘 조합 (명시적 체크는 여전히 우선함).
// - 공과금/교통비/토스카드: 개인 이동으로 보는 경우가 많아 자동 정산대상에서 제외
// - 토스카드(커플): 남편과 공동으로 쓰는 카드라 어떤 지출이든 정산이 필요 없음
const isAutoExcluded = (t) =>
  (t.source === '공과금' && t.category === '교통비' && t.paymentMethod === '토스카드') ||
  t.paymentMethod === '토스카드(커플)';

// 정산이 필요한(아직 정산 안 된) 지출인지 판정.
// 1) 본인부담(selfPaid)으로 처리했으면 정산 대상 아님.
// 2) needsSettlement가 명시적으로 지정돼 있으면 그 값 그대로.
// 3) 공과금 지출이고 오늘(기준일) 이후 거래면 자동으로 정산 대상 — 단, 자동제외 조합(토스카드 교통비 등)은 제외.
// 4) 그 외(과거 데이터)는 기존 "정산필요" 문자열로 판단.
export const needsSettle = (t) => {
  if (t.type !== 'expense') return false;
  if (isSelfPaid(t)) return false;
  if (t.needsSettlement !== undefined) return t.needsSettlement;
  if (t.source === '공과금' && t.date >= SETTLEMENT_BASELINE_DATE) return !isAutoExcluded(t);
  return ((t.description || '') + (t.memo || '')).includes('정산필요');
};

// 본인부담으로 처리한 공과금 지출 요약 (정산 대기 목록과 별도로 보여주기 위함)
export const calcSelfPaidSummary = (allTransactions) => {
  const items = allTransactions.filter((t) => t.type === 'expense' && t.source === '공과금' && isSelfPaid(t));
  const total = items.reduce((s, t) => s + t.amount, 0);
  return { items, count: items.length, total };
};

// 정산 필요 지출 중 아직 정산되지 않은 항목 알림 (전체 기간 대상, 월 무관)
// 목록 자체는 금액 내림차순으로 보여주되, "가장 오래된 항목" 표시는 날짜 기준으로 별도 계산
export const calcSettlementAlerts = (allTransactions) => {
  const today = new Date();
  const withDaysAgo = allTransactions.filter(needsSettle).map((t) => {
    const d = new Date(t.date + 'T00:00:00');
    const daysAgo = isNaN(d) ? 0 : Math.max(0, Math.floor((today - d) / 86400000));
    return { ...t, daysAgo };
  });
  const oldest = withDaysAgo.length
    ? withDaysAgo.reduce((a, b) => (b.daysAgo > a.daysAgo ? b : a))
    : null;
  const items = [...withDaysAgo].sort((a, b) => a.date.localeCompare(b.date));
  const total = items.reduce((s, t) => s + t.amount, 0);
  return { items, count: items.length, total, oldest };
};

export const calcNextMonthPrediction = (allTransactions) => {
  const trend = calcMonthlyTrend(allTransactions);
  if (!trend.length) return null;
  const recent = trend.slice(-3);
  // 예상 수입: 가장 최근 월 수입 (급여 기준)
  const predictedIncome = recent[recent.length - 1]?.수입 || 0;
  // 예상 지출: 최근 월 평균
  const avgExpense = Math.round(recent.reduce((s, m) => s + m.지출, 0) / recent.length);
  const saving = Math.max(0, predictedIncome - avgExpense);
  const deficit = Math.max(0, avgExpense - predictedIncome);
  return { income: predictedIncome, expense: avgExpense, saving, deficit, monthsUsed: recent.length };
};

export const calcCategoryBreakdown = (transactions, type = 'expense') => {
  const map = {};
  transactions
    .filter((t) => t.type === type)
    .forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

export const generateAdvice = (stats, transactions) => {
  const advice = [];

  if (stats.용돈잔액 < 0) {
    advice.push({
      icon: '⚠️',
      color: '#B94A34',
      text: `용돈 예산 ${formatKRW(ALLOWANCE)}을 ${formatKRW(-stats.용돈잔액)} 초과했습니다. 다음 달 지출 패턴을 점검해보세요.`,
    });
  } else if (stats.용돈잔액 < 30000) {
    advice.push({
      icon: '💡',
      color: '#B58BD0',
      text: `이번 달 용돈 잔액이 ${formatKRW(stats.용돈잔액)} 남았습니다. 월말까지 아껴쓰세요.`,
    });
  } else {
    advice.push({
      icon: '✅',
      color: '#3DB97A',
      text: `용돈 예산 관리 양호! 이번 달 ${formatKRW(stats.용돈잔액)} 남았습니다.`,
    });
  }

  if (stats.미정산 > 0) {
    advice.push({
      icon: '📋',
      color: '#8261A8',
      text: `공과금 ${formatKRW(stats.공과금지출)} 지출 중 ${formatKRW(stats.미정산)}이 아직 정산되지 않았습니다.`,
    });
  }

  const topCats = calcCategoryBreakdown(transactions);
  if (topCats.length > 0) {
    const top = topCats[0];
    advice.push({
      icon: '📊',
      color: '#A88AC7',
      text: `이번 달 최대 지출 카테고리는 '${top.name}' (${formatKRW(top.value)})입니다.`,
    });
  }

  const martCount = transactions.filter(
    (t) => t.source === '공과금' && t.category === '마트/장보기'
  ).length;
  if (martCount >= 3) {
    advice.push({
      icon: '🛒',
      color: '#9575B8',
      text: `이번 달 마트 방문 ${martCount}회. 장볼 때 목록 작성 후 한 번에 구매하면 충동구매를 줄일 수 있습니다.`,
    });
  }

  return advice;
};
