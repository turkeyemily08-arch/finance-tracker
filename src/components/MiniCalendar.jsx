const WD = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n) => String(n).padStart(2, '0');

// 날짜를 클릭하면 그 날짜로 새 거래 추가 모달이 열리는 캘린더.
// year/month는 App.jsx와 공유하는 상태 — 여기서 월을 바꾸면 아래 거래내역도 같이 그 달로 이동함.
export default function MiniCalendar({ year, month, onMonthChange, onDateClick }) {
  const today = new Date();
  const viewYear = year;
  const viewMonth = month;

  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array(daysInMonth).keys()].map((v) => (v === null ? null : v + 1));

  const isToday = (d) => d && viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1 && d === today.getDate();
  const dow = (d) => new Date(viewYear, viewMonth - 1, d).getDay();

  const prevMonth = () => { if (viewMonth === 1) onMonthChange(viewYear - 1, 12); else onMonthChange(viewYear, viewMonth - 1); };
  const nextMonth = () => { if (viewMonth === 12) onMonthChange(viewYear + 1, 1); else onMonthChange(viewYear, viewMonth + 1); };

  const navBtn = { border: 'none', background: '#F1EFFB', borderRadius: 8, width: 26, height: 26, cursor: 'pointer', fontSize: 13, color: '#6E4F96' };

  return (
    <div className="stat-card" style={{ textAlign: 'left', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={navBtn}>←</button>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#1F2937' }}>📅 {viewYear}년 {viewMonth}월</span>
        <button onClick={nextMonth} style={navBtn}>→</button>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
        marginBottom: 4, borderBottom: '2px solid #EEEBFA', paddingBottom: 6,
      }}>
        {WD.map((w, i) => (
          <div key={w} style={{
            textAlign: 'center', fontSize: 12, fontWeight: 700,
            color: i === 0 ? '#B94A34' : '#1F2937',
          }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const sunday = dow(d) === 0;
          const todayCell = isToday(d);
          return (
            <button
              key={i}
              onClick={() => onDateClick(`${viewYear}-${pad(viewMonth)}-${pad(d)}`)}
              style={{
                border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 14, fontWeight: todayCell ? 800 : 600,
                cursor: 'pointer',
                background: todayCell ? '#6E4F96' : sunday ? '#F7EEF3' : '#F8FAFC',
                color: todayCell ? '#fff' : sunday ? '#B94A34' : '#1F2937',
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
