import { useState } from 'react';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n) => String(n).padStart(2, '0');

// 날짜를 클릭하면 그 날짜로 새 거래 추가 모달이 열리는 미니 캘린더.
export default function MiniCalendar({ onDateClick }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1~12

  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array(daysInMonth).keys()].map((v) => (v === null ? null : v + 1));

  const isToday = (d) => d && viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1 && d === today.getDate();

  const prevMonth = () => { if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); } else setViewMonth((m) => m - 1); };
  const nextMonth = () => { if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); } else setViewMonth((m) => m + 1); };

  const navBtn = { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', padding: '2px 6px' };

  return (
    <div className="stat-card" style={{ textAlign: 'left', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button onClick={prevMonth} style={navBtn}>←</button>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>📅 {viewYear}년 {viewMonth}월</span>
        <button onClick={nextMonth} style={navBtn}>→</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: 10, color: '#9CA3AF', marginBottom: 4, textAlign: 'center' }}>
        {WD.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => d ? (
          <button
            key={i}
            onClick={() => onDateClick(`${viewYear}-${pad(viewMonth)}-${pad(d)}`)}
            title="클릭하면 이 날짜로 거래 추가"
            style={{
              border: 'none', borderRadius: 6, padding: '4px 0', fontSize: 11, cursor: 'pointer',
              background: isToday(d) ? '#7C6FE8' : '#F8FAFC',
              color: isToday(d) ? '#fff' : '#374151', fontWeight: isToday(d) ? 700 : 400,
            }}
          >
            {d}
          </button>
        ) : <div key={i} />)}
      </div>
      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>날짜를 클릭하면 그 날짜로 거래를 바로 추가해요</div>
    </div>
  );
}
