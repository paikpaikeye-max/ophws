"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useRouter } from 'next/navigation';

export default function ScheduleViewer() {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [roster, setRoster] = useState({});
    const [patientCounts, setPatientCounts] = useState({});
    const [closedSlots, setClosedSlots] = useState({});
    const [amCount, setAmCount] = useState(2);
    const [pmCount, setPmCount] = useState(1);
    const [memo, setMemo] = useState("");
    const [staffData, setStaffData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWeekModal, setShowWeekModal] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);

    const fixedTasks = ['전공의외래', '총외래업무', '검안실', '주사/처치', '수술실(OR)'];

    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getWeekDays = (baseDate) => {
        const d = new Date(baseDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return [...Array(7)].map((_, i) => {
            const dayData = new Date(monday);
            dayData.setDate(monday.getDate() + i);
            return dayData;
        });
    };

    useEffect(() => {
        async function loadInitialData() {
            setLoading(true);
            const dateStr = formatDate(selectedDate);
            const { data: schedule } = await supabase.from('daily_schedules').select('*').eq('work_date', dateStr).single();
            if (schedule) {
                setRoster(schedule.roster_data || {});
                setPatientCounts(schedule.patient_counts || {});
                setClosedSlots(schedule.closed_slots || {});
                setAmCount(schedule.am_count || 2);
                setPmCount(schedule.pm_count || 1);
                setMemo(schedule.memo || "");
            } else {
                setRoster({}); setPatientCounts({}); setClosedSlots({}); setMemo("");
            }
            const { data: mems } = await supabase.from('members').select('name, phone');
            const { data: profs } = await supabase.from('professors').select('initial, phone');
            setStaffData([...(mems || []).map(m => ({ name: m.name, phone: m.phone })), ...(profs || []).map(p => ({ name: p.initial, phone: p.phone }))]);
            setLoading(false);
        }
        loadInitialData();
    }, [selectedDate]);

    const handleCall = (fullName) => {
        if (!fullName || fullName === '-') return;
        const cleanName = fullName.split('(')[0].trim();
        const person = staffData.find(s => s.name === cleanName);
        if (person && person.phone) window.location.href = `tel:${person.phone}`;
        else alert(`${cleanName} 님의 전화번호 정보가 없습니다.`);
    };

    const saveMemo = async (newMemo) => {
        await supabase.from('daily_schedules').upsert({ work_date: formatDate(selectedDate), memo: newMemo, updated_at: new Date() }, { onConflict: 'work_date' });
    };

    const isWorkDay = () => {
        const shifts = ['오전', '오후'];
        for (const shift of shifts) {
            const count = shift === '오전' ? amCount : pmCount;
            for (let i = 0; i < count; i++) {
                if (roster[`${shift}-prof-slot-${i}`] || roster[`${shift}-outp-${i}-m1`] || roster[`${shift}-outp-${i}-m2`]) return true;
            }
            for (const task of fixedTasks) {
                if (roster[`${shift}-${task}-m1`] || roster[`${shift}-${task}-m2`]) return true;
            }
        }
        return false;
    };

    const handleWeekPrint = async (baseDate) => {
        const weekDates = getWeekDays(new Date(baseDate));
        const weekStrArr = weekDates.map(d => formatDate(d));
        const { data } = await supabase.from('daily_schedules').select('*').in('work_date', weekStrArr);

        const printWindow = window.open('', '_blank');
        const htmlContent = `
      <html>
        <head>
          <title>주간 인력 배치표</title>
          <style>
            @page { size: A4 landscape; margin: 5mm; }
            body { font-family: 'Malgun Gothic', sans-serif; font-size: 8.5px; margin: 0; padding: 10px; color: #000; }
            .header { text-align: center; font-size: 16px; font-weight: 900; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.5px solid #000; }
            th, td { border: 1px solid #000; padding: 2px 1px; text-align: center; vertical-align: middle; white-space: nowrap; }
            th { background: #f8f9fa; font-weight: bold; height: 25px; width: 14.5%; }
            th.narrow { width: 7%; }
            th.bg-gray { width: 45px; }
            .sat { color: #0000FF; } .sun { color: #FF0000; }
            .off-cell { text-align: center; font-size: 8px; line-height: 1.3; height: 40px; }
            .off-name { display: block; border-bottom: 0.5px solid #eee; }
            .off-name:last-child { border-bottom: none; }
            .prof-row { display: flex; border-bottom: 0.5px solid #000; align-items: stretch; min-height: 28px; }
            .prof-name { width: 35%; font-weight: 900; border-right: 0.5px solid #000; background: #fdfdfd; display: flex; flex-direction: column; justify-content: center; }
            .patient-count { font-size: 7px; font-weight: normal; margin-top: 1px; }
            .new-pat { color: #FF0000; }
            .staff-cols { width: 65%; display: flex; }
            .staff-col { flex: 1; border-right: 0.5px solid #000; display: flex; align-items: center; justify-content: center; }
            .staff-col:last-child { border-right: none; }
            .task-row { display: flex; border-bottom: 0.4px solid #aaa; align-items: stretch; min-height: 18px; }
            .task-title { width: 35%; font-size: 7.5px; background: #f9f9f9; border-right: 0.5px solid #000; display: flex; align-items: center; justify-content: center; }
            .task-staffs { width: 65%; display: flex; }
          </style>
        </head>
        <body>
          <div class="header">주간 인력 배치표 (${formatDate(weekDates[0])} ~ ${formatDate(weekDates[6])})</div>
          <table>
            <thead>
              <tr>
                <th class="bg-gray">구분</th>
                ${weekDates.map(d => {
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            const isSat = d.getDay() === 6; const isSun = d.getDay() === 0;
            const className = (isSat ? 'sat' : (isSun ? 'sun' : '')) + (isSat || isSun ? ' narrow' : '');
            return `<th class="${className}">${d.getMonth() + 1}/${d.getDate()}(${dayNames[d.getDay()]})</th>`;
        }).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="bg-gray" style="font-weight:bold; color:#e11d48;">오프</td>
                ${weekStrArr.map(d => {
            const dayData = data?.find(i => i.work_date === d);
            const offList = dayData?.roster_data?.["VACATION-SLOT"] || [];
            return `<td class="off-cell">${offList.map(name => `<span class="off-name">${name}</span>`).join('') || '-'}</td>`;
        }).join('')}
              </tr>
              <tr>
                <td class="bg-gray" style="color:#0369a1;">오전</td>
                ${weekStrArr.map(d => {
            const dayData = data?.find(item => item.work_date === d);
            const isWeekend = new Date(d).getDay() === 0 || new Date(d).getDay() === 6;
            if (!dayData || isWeekend) return '<td>-</td>';
            let html = '<div style="display:flex; flex-direction:column;">';
            for (let i = 0; i < (dayData.am_count || 2); i++) {
                const p = dayData.roster_data?.[`오전-prof-slot-${i}`];
                if (p && !dayData.closed_slots?.[`오전-prof-slot-${i}`]) {
                    const total = dayData.patient_counts?.[`오전-prof-slot-${i}-total`] || 0;
                    const newP = dayData.patient_counts?.[`오전-prof-slot-${i}-new`] || 0;
                    html += `<div class="prof-row"><div class="prof-name">${p}<div class="patient-count">${total} <span class="new-pat">${newP}</span></div></div><div class="staff-cols"><div class="staff-col">${dayData.roster_data?.[`오전-outp-${i}-m1`] || ''}</div><div class="staff-col">${dayData.roster_data?.[`오전-outp-${i}-m2`] || ''}</div></div></div>`;
                }
            }
            fixedTasks.forEach(task => {
                html += `<div class="task-row"><div class="task-title">${task}</div><div class="task-staffs"><div class="staff-col">${dayData.roster_data?.[`오전-${task}-m1`] || ''}</div><div class="staff-col">${dayData.roster_data?.[`오전-${task}-m2`] || ''}</div></div></div>`;
            });
            return `<td>${html}</div></td>`;
        }).join('')}
              </tr>
              <tr>
                <td class="bg-gray" style="color:#0f766e;">오후</td>
                ${weekStrArr.map(d => {
            const dayData = data?.find(item => item.work_date === d);
            const isWeekend = new Date(d).getDay() === 0 || new Date(d).getDay() === 6;
            if (!dayData || isWeekend) return '<td>-</td>';
            let html = '<div style="display:flex; flex-direction:column;">';
            for (let i = 0; i < (dayData.pm_count || 1); i++) {
                const p = dayData.roster_data?.[`오후-prof-slot-${i}`];
                if (p && !dayData.closed_slots?.[`오후-prof-slot-${i}`]) {
                    const total = dayData.patient_counts?.[`오후-prof-slot-${i}-total`] || 0;
                    const newP = dayData.patient_counts?.[`오후-prof-slot-${i}-new`] || 0;
                    html += `<div class="prof-row"><div class="prof-name">${p}<div class="patient-count">${total} <span class="new-pat">${newP}</span></div></div><div class="staff-cols"><div class="staff-col">${dayData.roster_data?.[`오후-outp-${i}-m1`] || ''}</div><div class="staff-col">${dayData.roster_data?.[`오후-outp-${i}-m2`] || ''}</div></div></div>`;
                }
            }
            fixedTasks.forEach(task => {
                html += `<div class="task-row"><div class="task-title">${task}</div><div class="task-staffs"><div class="staff-col">${dayData.roster_data?.[`오후-${task}-m1`] || ''}</div><div class="staff-col">${dayData.roster_data?.[`오후-${task}-m2`] || ''}</div></div></div>`;
            });
            return `<td>${html}</div></td>`;
        }).join('')}
              </tr>
              <tr><td class="bg-gray">당직</td> ${weekStrArr.map(d => `<td>${data?.find(i => i.work_date === d)?.roster_data?.["NIGHT-DUTY"] || '-'}</td>`).join('')}</tr>
              <tr><td class="bg-gray">온콜</td> ${weekStrArr.map(d => `<td>${data?.find(i => i.work_date === d)?.roster_data?.["ONCALL-PROF"] || '-'}</td>`).join('')}</tr>
              <tr><td class="bg-gray">망막</td> ${weekStrArr.map(d => `<td>${data?.find(i => i.work_date === d)?.roster_data?.["RETINA-ONCALL"] || '-'}</td>`).join('')}</tr>
            </tbody>
          </table>
          <script>setTimeout(() => { window.print(); }, 500);</script>
        </body>
      </html>
    `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-bold">데이터 로딩 중...</div>;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans select-none">
            {/* 상단 헤더: OPHWS Schedule 명칭 변경 및 클릭 시 날짜 선택 유지 */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md z-30 border-b p-4 flex justify-between items-center shadow-sm">
                <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-2 text-xl font-bold">◀</button>
                <div className="text-center cursor-pointer active:opacity-50" onClick={() => setShowDateModal(true)}>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">OPHWS Schedule</p>
                    <h1 className="text-xl font-black">{formatDate(selectedDate)}</h1>
                    <p className="text-[9px] text-slate-400 font-bold tracking-tight">터치하여 날짜 선택</p>
                </div>
                <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-2 text-xl font-bold">▶</button>
            </header>

            <div className="max-w-md mx-auto p-4 space-y-6">
                <section className="bg-slate-100 p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-black text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-tight">🚫 금일 오프 / 휴가</h3>
                    <div className="flex flex-wrap gap-2">
                        {roster["VACATION-SLOT"]?.length > 0 ? (
                            roster["VACATION-SLOT"].map(name => (
                                <button key={name} onClick={() => handleCall(name)} className="bg-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm border border-slate-200 text-slate-700">{name}</button>
                            ))
                        ) : <p className="text-[11px] text-slate-400 font-bold italic">오늘은 휴가자가 없습니다.</p>}
                    </div>
                </section>

                {isWorkDay() ? (
                    ['오전', '오후'].map(shift => (
                        <section key={shift} className="space-y-3">
                            <h3 className={`text-xs font-black px-5 py-2 rounded-full text-white inline-block shadow-sm ${shift === '오전' ? 'bg-sky-700' : 'bg-teal-700'}`}>{shift} 진료 배치</h3>
                            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-center border-collapse text-[13px]">
                                    <tbody className="divide-y divide-slate-100">
                                        {[...Array(shift === '오전' ? amCount : pmCount)].map((_, i) => {
                                            const pSlot = `${shift}-prof-slot-${i}`;
                                            if (closedSlots[pSlot] || !roster[pSlot]) return null;
                                            return (
                                                <tr key={i}>
                                                    <td className="p-3 w-[100px] bg-slate-50/50 border-r border-slate-100">
                                                        <button onClick={() => handleCall(roster[pSlot])} className="font-black text-slate-800 underline decoration-slate-300 underline-offset-4">{roster[pSlot]}</button>
                                                        <p className="text-[9px] text-slate-400 font-bold mt-1">예약 {patientCounts[`${pSlot}-total`] || 0}</p>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleCall(roster[`${shift}-outp-${i}-m1`])} className="flex-1 bg-slate-50 text-blue-700 py-2.5 rounded-lg font-bold border border-slate-100">{roster[`${shift}-outp-${i}-m1`] || '-'}</button>
                                                            <button onClick={() => handleCall(roster[`${shift}-outp-${i}-m2`])} className="flex-1 bg-slate-50 text-blue-700 py-2.5 rounded-lg font-bold border border-slate-100">{roster[`${shift}-outp-${i}-m2`] || '-'}</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {fixedTasks.map(task => (
                                            <tr key={task} className="bg-slate-50/20">
                                                <td className="p-3 w-[100px] font-bold text-slate-500 border-r border-slate-100 text-[11px]">{task}</td>
                                                <td className="p-3">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleCall(roster[`${shift}-${task}-m1`])} className="flex-1 bg-white text-slate-600 py-2.5 rounded-lg font-bold border border-slate-200">{roster[`${shift}-${task}-m1`] || '-'}</button>
                                                        <button onClick={() => handleCall(roster[`${shift}-${task}-m2`])} className="flex-1 bg-white text-slate-600 py-2.5 rounded-lg font-bold border border-slate-200">{roster[`${shift}-${task}-m2`] || '-'}</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ))
                ) : (
                    <div className="bg-slate-200/50 rounded-[2rem] p-10 text-center border-2 border-dashed border-slate-300">
                        <p className="text-slate-500 font-black text-sm">오늘은 설정된 배치 정보가 없습니다.</p>
                        <p className="text-slate-400 text-[11px] mt-1">(주말 또는 공휴일)</p>
                    </div>
                )}

                <section className="grid grid-cols-2 gap-3">
                    {[{ label: '당직전공의', id: 'NIGHT-DUTY' }, { label: '온콜교수', id: 'ONCALL-PROF' }, { label: '망막온콜', id: 'RETINA-ONCALL' }].map(item => (
                        <div key={item.id} className="bg-slate-700 text-white p-4 rounded-3xl text-center shadow-md active:scale-95 transition-transform" onClick={() => handleCall(roster[item.id])}>
                            <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{item.label}</p>
                            <p className="text-[15px] font-black">{roster[item.id] || '미정'}</p>
                        </div>
                    ))}
                </section>

                <section className="bg-indigo-50/50 p-6 rounded-[2.5rem] border border-indigo-100 shadow-inner">
                    <h3 className="text-xs font-black text-indigo-600 mb-3 flex items-center gap-2 uppercase tracking-tight">📢 오늘의 공지사항</h3>
                    <textarea className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 placeholder:text-indigo-200 resize-none min-h-[120px]" placeholder="내용을 입력하세요..." value={memo} onChange={(e) => setMemo(e.target.value)} onBlur={() => saveMemo(memo)} />
                </section>

                <button onClick={() => setShowWeekModal(true)} className="w-full bg-slate-200 py-4 rounded-3xl font-black text-slate-500 shadow-sm border border-slate-300 active:bg-slate-300 mt-4 transition-colors">📅 일주일 배치표 보기 (PDF)</button>

                {/* 하단 네비게이션 버튼 (2열 배치) */}
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={() => router.push('/')}
                        className="flex-1 bg-white py-4 rounded-3xl font-black text-slate-500 shadow-sm border border-slate-200 active:bg-slate-100 transition-colors"
                    >
                        🏠 메인 페이지
                    </button>
                    <button
                        onClick={() => router.push('/edit')}
                        className="flex-1 bg-slate-800 py-4 rounded-3xl font-black text-white shadow-lg active:bg-slate-900 transition-colors"
                    >
                        📝 배치표 작성
                    </button>
                </div>

                {showDateModal && (
                    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full animate-fade-in-up">
                            <h3 className="text-lg font-black text-slate-800 mb-2 text-center">날짜 선택</h3>
                            <div className="calendar-modal mb-6 border rounded-2xl overflow-hidden scale-90">
                                <Calendar
                                    onChange={(date) => { setSelectedDate(date); setShowDateModal(false); }}
                                    value={selectedDate}
                                    calendarType="gregory"
                                    tileClassName={({ date, view }) => {
                                        if (view === 'month' && formatDate(date) === formatDate(new Date())) {
                                            return 'is-today-tile';
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setSelectedDate(new Date()); setShowDateModal(false); }} className="flex-1 py-4 rounded-2xl font-bold bg-blue-50 text-blue-600">오늘로 가기</button>
                                <button onClick={() => setShowDateModal(false)} className="flex-1 py-4 rounded-2xl font-bold bg-slate-100 text-slate-600">닫기</button>
                            </div>
                        </div>
                    </div>
                )}

                {showWeekModal && (
                    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full animate-fade-in-up">
                            <h3 className="text-lg font-black text-slate-800 mb-2 text-center">주간 배치표 조회</h3>
                            <div className="calendar-modal mb-6 border rounded-2xl overflow-hidden scale-90">
                                <Calendar
                                    onChange={(date) => { handleWeekPrint(date); setShowWeekModal(false); }}
                                    value={selectedDate}
                                    calendarType="gregory"
                                />
                            </div>
                            <button onClick={() => setShowWeekModal(false)} className="w-full py-4 rounded-2xl font-bold bg-slate-100 text-slate-600">닫기</button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-calendar { background: white !important; border: none !important; width: 100% !important; }
                .react-calendar__tile--active { background: #2563eb !important; border-radius: 0.5rem; }
                .is-today-tile { 
                    color: #2563eb !important; 
                    font-weight: 900 !important; 
                    position: relative;
                }
                .is-today-tile::after {
                    content: '오늘';
                    position: absolute;
                    bottom: 2px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 7px;
                    color: #2563eb;
                }
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}