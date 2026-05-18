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
  const income = transactions
    .filter((t) => t.type === 'income')
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
    미정산: 공과금지출 - 정산수입,
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
    if (t.type === 'income') map[key].income += t.amount;
    else map[key].expense += t.amount;
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
      color: '#E06666',
      text: `용돈 예산 ${formatKRW(ALLOWANCE)}을 ${formatKRW(-stats.용돈잔액)} 초과했습니다. 다음 달 지출 패턴을 점검해보세요.`,
    });
  } else if (stats.용돈잔액 < 30000) {
    advice.push({
      icon: '💡',
      color: '#FF9900',
      text: `이번 달 용돈 잔액이 ${formatKRW(stats.용돈잔액)} 남았습니다. 월말까지 아껴쓰세요.`,
    });
  } else {
    advice.push({
      icon: '✅',
      color: '#6AA84F',
      text: `용돈 예산 관리 양호! 이번 달 ${formatKRW(stats.용돈잔액)} 남았습니다.`,
    });
  }

  if (stats.미정산 > 0) {
    advice.push({
      icon: '📋',
      color: '#4F86C6',
      text: `공과금 ${formatKRW(stats.공과금지출)} 지출 중 ${formatKRW(stats.미정산)}이 아직 정산되지 않았습니다.`,
    });
  }

  const topCats = calcCategoryBreakdown(transactions);
  if (topCats.length > 0) {
    const top = topCats[0];
    advice.push({
      icon: '📊',
      color: '#8E7CC3',
      text: `이번 달 최대 지출 카테고리는 '${top.name}' (${formatKRW(top.value)})입니다.`,
    });
  }

  const martCount = transactions.filter(
    (t) => t.source === '공과금' && t.category === '마트/장보기'
  ).length;
  if (martCount >= 3) {
    advice.push({
      icon: '🛒',
      color: '#45818E',
      text: `이번 달 마트 방문 ${martCount}회. 장볼 때 목록 작성 후 한 번에 구매하면 충동구매를 줄일 수 있습니다.`,
    });
  }

  return advice;
};
