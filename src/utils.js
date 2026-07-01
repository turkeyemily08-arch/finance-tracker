import { ALLOWANCE } from './constants';

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

export const calcMonthStats = (transactions) => {
  // 정산은 남편 공동저축 계좌이체이므로 수입으로 집계하지 않음
  const income = transactions
    .filter((t) => t.type === 'income' && t.source !== '정산')
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === 'expense')
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
    if (!map[key]) map[key] = { month: key, income: 0, expense: 0 };
    // 정산은 계좌이체이므로 수입으로 집계하지 않음
    if (t.type === 'income' && t.source !== '정산') map[key].income += t.amount;
    else if (t.type === 'expense') map[key].expense += t.amount;
  });
  return Object.values(map)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      month: m.month.slice(5) + '월',
      수입: m.income,
      지출: m.expense,
      저축: Math.max(m.income - m.expense, 0),
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
      color: '#C77D9B',
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
      color: '#5FAE96',
      text: `용돈 예산 관리 양호! 이번 달 ${formatKRW(stats.용돈잔액)} 남았습니다.`,
    });
  }

  if (stats.미정산 > 0) {
    advice.push({
      icon: '📋',
      color: '#7C6FE8',
      text: `공과금 ${formatKRW(stats.공과금지출)} 지출 중 ${formatKRW(stats.미정산)}이 아직 정산되지 않았습니다.`,
    });
  }

  const topCats = calcCategoryBreakdown(transactions);
  if (topCats.length > 0) {
    const top = topCats[0];
    advice.push({
      icon: '📊',
      color: '#9D8CF0',
      text: `이번 달 최대 지출 카테고리는 '${top.name}' (${formatKRW(top.value)})입니다.`,
    });
  }

  const martCount = transactions.filter(
    (t) => t.source === '공과금' && t.category === '마트/장보기'
  ).length;
  if (martCount >= 3) {
    advice.push({
      icon: '🛒',
      color: '#8B7FE8',
      text: `이번 달 마트 방문 ${martCount}회. 장볼 때 목록 작성 후 한 번에 구매하면 충동구매를 줄일 수 있습니다.`,
    });
  }

  return advice;
};
