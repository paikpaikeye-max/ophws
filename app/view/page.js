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
    const [isMemoDirty, setIsMemoDirty] = useState(false); // [추가] 메모 수정 여부
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

    // [복구] 주간 날짜 계산 로직
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

    // [추가] 이름 색상 구분 클래스
    const getNameColorClass = (fullName) => {
        if (!fullName || fullName === '-') return 'text-slate-400';
        const cleanName = fullName.split('(')[0].trim();
        const staff = staffData.find(s => s.name === cleanName);
        if (staff?.role === 'Resident') return 'text-blue-600 font-bold';
        return 'text-slate-800 font-bold';
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
                setIsMemoDirty(false);
            } else {
                setRoster({}); setPatientCounts({}); setClosedSlots({}); setMemo(""); setIsMemoDirty(false);
            }
            // role 데이터까지 가져오도록 수정
            const { data: mems } = await supabase.from('members').select('name, phone, role');
            const { data: profs } = await supabase.from('professors').select('initial, phone');
            setStaffData([
                ...(mems || []).map(m => ({ name: m.name, phone: m.phone, role: m.role })),
                ...(profs || []).map(p => ({ name: p.initial, phone: p.phone, role: 'Professor' }))
            ]);
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

    // [수정] 공지사항 저장 로직 (roster_data 누락 방지 포함)
    const handleSaveMemo = async () => {
        const { error } = await supabase.from('daily_schedules').upsert({
            work_date: formatDate(selectedDate),
            memo: memo,
            roster_data: roster || {},
            updated_at: new Date()
        }, { onConflict: 'work_date' });

        if (error) alert("저장 실패: " + error.message);
        else {
            setIsMemoDirty(false);
            alert("공지사항이 저장되었습니다.");
        }
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

        // 1. CSS 스타일: 선 굵기 통일 및 지저분함 제거
        const style = `
        <style>
            @page { size: A4 landscape; margin: 5mm; }
            body { font-family: 'Malgun Gothic', sans-serif; font-size: 7.2px; margin: 0; padding: 10px; color: #000; }
            .header { text-align: center; font-size: 16px; font-weight: 900; margin-bottom: 10px; }
            
            /* 표 선 설정: border-collapse를 사용하고 선 두께를 통일 */
            table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.5px solid #000; }
            th, td { border: 1px solid #444; padding: 0; text-align: center; vertical-align: top; }
            
            /* 구분 열 및 주말 열 폭 설정 */
            th:nth-child(1), td:nth-child(1) { width: 45px; background: #f2f2f2; }
            th:nth-child(2), td:nth-child(2), th:nth-child(3), td:nth-child(3), 
            th:nth-child(4), td:nth-child(4), th:nth-child(5), td:nth-child(5), 
            th:nth-child(6), td:nth-child(6) { width: 16.5%; }
            th:nth-child(7), td:nth-child(7), th:nth-child(8), td:nth-child(8) { width: 8.5%; }

            th { background: #e9ecef; height: 26px; vertical-align: middle; border-bottom: 1.5px solid #000; }
            .sat { color: #0044cc; } .sun { color: #cc0000; }

            /* 셀 내부 높이 고정 (옆 칸과 선을 맞춤) */
            .cell-container { display: flex; flex-direction: column; height: 210px; }
            .prof-section { flex: 1; display: flex; flex-direction: column; }
            
            /* 교수님 슬롯: border-bottom을 0.5px 실선으로 고정 */
            .prof-slot { height: 34px; display: flex; border-bottom: 0.5px solid #444; box-sizing: border-box; }
            .prof-slot:last-child { border-bottom: none; }
            
            .prof-name { width: 38%; font-weight: 900; border-right: 1px solid #444; background: #fafafa; display: flex; flex-direction: column; justify-content: center; font-size: 7.5px; }
            .patient-count { font-size: 6.2px; font-weight: normal; margin-top: 1px; }
            .new-pat { color: #cc0000; font-weight: bold; }
            
            .staff-cols { width: 62%; display: flex; }
            .staff-col { flex: 1; border-right: 0.5px solid #444; display: flex; align-items: center; justify-content: center; font-size: 7px; white-space: nowrap; }
            .staff-col:last-child { border-right: none; }

            /* 하단 업무 영역: 위 교수님 영역과 굵은 선으로 구분 */
            .task-section { border-top: 1.5px solid #000; background: #fff; }
            .task-row { display: flex; border-bottom: 0.5px solid #444; height: 19px; box-sizing: border-box; }
            .task-row:last-child { border-bottom: none; }
            .task-title { width: 38%; font-size: 7px; background: #f8f9fa; border-right: 1px solid #444; display: flex; align-items: center; justify-content: center; font-weight: bold; }
            .task-staffs { width: 62%; display: flex; }
            
            .off-row { height: 40px; }
            .off-row td { vertical-align: middle; padding: 2px; background: #fffafa; }
            .duty-row { height: 24px; font-weight: bold; background: #fdfdfd; }
            .duty-row td { vertical-align: middle; border-top: 1.5px solid #000; }
            .weekend-bg { background: #fcfcfc; color: #bbb; vertical-align: middle; }
        </style>
    `;

        // 2. 변수 정의부 (thead, rows)
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const theadHtml = `
        <thead>
            <tr>
                <th>구분</th>
                ${weekDates.map(d => {
            const isSat = d.getDay() === 6;
            const isSun = d.getDay() === 0;
            return `<th class="${isSat ? 'sat' : (isSun ? 'sun' : '')}">${d.getMonth() + 1}/${d.getDate()}(${dayNames[d.getDay()]})</th>`;
        }).join('')}
            </tr>
        </thead>
    `;

        const offRowHtml = `
        <tr class="off-row">
            <td style="font-weight:bold; color:#e11d48;">오프</td>
            ${weekStrArr.map(d => {
            const dayData = data?.find(i => i.work_date === d);
            const offList = dayData?.roster_data?.["VACATION-SLOT"] || [];
            return `<td>${offList.map(name => `<div style="border-bottom:0.1px solid #eee;">${name}</div>`).join('') || '-'}</td>`;
        }).join('')}
        </tr>
    `;

        const shiftsHtml = ['오전', '오후'].map(shift => {
            const shiftColor = shift === '오전' ? '#0369a1' : '#0f766e';
            return `
            <tr>
                <td style="vertical-align:middle; font-weight:bold; color:${shiftColor}">${shift}</td>
                ${weekStrArr.map(d => {
                const dayData = data?.find(item => item.work_date === d);
                const isWeekend = new Date(d).getDay() === 0 || new Date(d).getDay() === 6;

                if (!dayData || isWeekend) return '<td class="weekend-bg">-</td>';

                // 교수님 섹션 (최대 3슬롯 기준)
                // 교수님 섹션 (최대 3슬롯 기준)
                let profSlots = '';
                const renderedProfs = new Set(); // 중복 출력 방지를 위한 세트

                for (let i = 0; i < 3; i++) {
                    const p = dayData.roster_data?.[shift + '-prof-slot-' + i];
                    const isClosed = dayData.closed_slots?.[shift + '-prof-slot-' + i];

                    // 1. 이름이 있고, 아직 해당 요일/오전오후 내에서 출력되지 않은 교수님인 경우
                    if (p && !renderedProfs.has(p)) {
                        renderedProfs.add(p); // 출력 목록에 추가

                        const total = dayData.patient_counts?.[shift + '-prof-slot-' + i + '-total'] || 0;
                        const newP = dayData.patient_counts?.[shift + '-prof-slot-' + i + '-new'] || 0;

                        // 휴진 여부에 따른 스타일 및 문구 결정
                        const closedText = isClosed ? '<span style="color:red; font-size:6px;">(휴진)</span>' : '';
                        const nameStyle = isClosed ? 'color: #aaa; text-decoration: line-through;' : '';

                        profSlots += `
            <div class="prof-slot" style="${isClosed ? 'background: #fdf2f2;' : ''}">
                <div class="prof-name" style="${nameStyle}">
                    ${p} ${closedText}
                    <div class="patient-count">${total} <span class="new-pat">/ ${newP}</span></div>
                </div>
                <div class="staff-cols">
                    <div class="staff-col">${dayData.roster_data?.[shift + '-outp-' + i + '-m1'] || ''}</div>
                    <div class="staff-col">${dayData.roster_data?.[shift + '-outp-' + i + '-m2'] || ''}</div>
                </div>
            </div>`;
                    }
                    // 2. 이미 출력된 교수님이거나(중복), 데이터가 없는 경우 -> 빈 칸을 생성하여 선을 유지
                    else {
                        profSlots += `
            <div class="prof-slot">
                <div class="prof-name"></div>
                <div class="staff-cols">
                    <div class="staff-col"></div>
                    <div class="staff-col"></div>
                </div>
            </div>`;
                    }
                }

                const taskRows = fixedTasks.map(task => `
                        <div class="task-row">
                            <div class="task-title">${task}</div>
                            <div class="task-staffs">
                                <div class="staff-col">${dayData.roster_data?.[shift + '-' + task + '-m1'] || ''}</div>
                                <div class="staff-col">${dayData.roster_data?.[shift + '-' + task + '-m2'] || ''}</div>
                            </div>
                        </div>
                    `).join('');

                return `<td>
                        <div class="cell-container">
                            <div class="prof-section">${profSlots}</div>
                            <div class="task-section">${taskRows}</div>
                        </div>
                    </td>`;
            }).join('')}
            </tr>
        `;
        }).join('');

        const dutyRowsHtml = ['NIGHT-DUTY', 'ONCALL-PROF', 'RETINA-ONCALL'].map(id => {
            const label = id === 'NIGHT-DUTY' ? '당직' : (id === 'ONCALL-PROF' ? '온콜' : '망막');
            return `
            <tr class="duty-row">
                <td>${label}</td>
                ${weekStrArr.map(d => {
                const dData = data?.find(i => i.work_date === d);
                return `<td>${dData?.roster_data?.[id] || '-'}</td>`;
            }).join('')}
            </tr>
        `;
        }).join('');

        // 3. 최종 조립
        const htmlContent = `
        <html>
            <head>${style}</head>
            <body>
                <div class="header">주간 인력 배치표 (${formatDate(weekDates[0])} ~ ${formatDate(weekDates[6])})</div>
                <table>
                    ${theadHtml}
                    <tbody>
                        ${offRowHtml}
                        ${shiftsHtml}
                        ${dutyRowsHtml}
                    </tbody>
                </table>
                <script>setTimeout(() => { window.print(); }, 500);</script>
            </body>
        </html>
    `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };
    if (loading) return <div className="h-screen flex items-center justify-center font-bold text-slate-500">데이터 로딩 중...</div>;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans select-none">
            {/* 상단 헤더 */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md z-30 border-b p-4 flex justify-between items-center shadow-sm">
                <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-2 text-xl font-bold">◀</button>
                <div className="text-center cursor-pointer active:opacity-50" onClick={() => setShowDateModal(true)}>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">OPHWS Schedule</p>
                    <h1 className="text-xl font-black">{formatDate(selectedDate)}</h1>
                    <p className="text-[9px] text-slate-400 font-bold tracking-tight">터치하여 날짜 선택</p>
                </div>
                <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-2 text-xl font-bold">▶</button>
            </header>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {/* [최신] 당직 인원 3열 배치 */}
                <section className="grid grid-cols-3 gap-2">
                    {[
                        { label: '당직전공의', id: 'NIGHT-DUTY' },
                        { label: '온콜교수', id: 'ONCALL-PROF' },
                        { label: '망막온콜', id: 'RETINA-ONCALL' }
                    ].map(item => (
                        <div key={item.id} className="bg-slate-700 text-white p-2.5 rounded-2xl text-center shadow-md active:scale-95 transition-transform" onClick={() => handleCall(roster[item.id])}>
                            <p className="text-[8px] font-black text-slate-400 mb-0.5 uppercase tracking-tighter truncate px-1">{item.label}</p>
                            <p className={`text-[13px] ${item.id === 'NIGHT-DUTY' ? 'text-blue-300' : 'text-white'} font-black truncate`}>{roster[item.id] || '미정'}</p>
                        </div>
                    ))}
                </section>

                {/* 오프 / 휴가 명단 */}
                <section className="bg-slate-100 p-4 rounded-[2rem] border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-tight">🚫 금일 오프 / 휴가</h3>
                    <div className="flex flex-wrap gap-2">
                        {roster["VACATION-SLOT"]?.length > 0 ? (
                            roster["VACATION-SLOT"].map(name => (
                                <button key={name} onClick={() => handleCall(name)} className={`bg-white px-3 py-1.5 rounded-xl text-xs shadow-sm border border-slate-200 ${getNameColorClass(name)}`}>
                                    {name}
                                </button>
                            ))
                        ) : <p className="text-[10px] text-slate-400 font-bold italic px-1">오늘은 휴가자가 없습니다.</p>}
                    </div>
                </section>

                {/* 진료 배치 메인 테이블 */}
                {isWorkDay() ? (
                    ['오전', '오후'].map(shift => (
                        <section key={shift} className="space-y-2">
                            <h3 className={`text-[11px] font-black px-4 py-1.5 rounded-full text-white inline-block shadow-sm ${shift === '오전' ? 'bg-sky-700' : 'bg-teal-700'}`}>{shift} 진료 배치</h3>
                            <div className="bg-white rounded-[1.2rem] shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-center border-collapse text-[13px]">
                                    <tbody className="divide-y divide-slate-100">
                                        {[...Array(shift === '오전' ? amCount : pmCount)].map((_, i) => {
                                            const pSlot = `${shift}-prof-slot-${i}`;
                                            if (closedSlots[pSlot] || !roster[pSlot]) return null;
                                            return (
                                                <tr key={i}>
                                                    <td className="p-1.5 w-[90px] bg-slate-50/50 border-r border-slate-100 leading-tight">
                                                        <button onClick={() => handleCall(roster[pSlot])} className="font-black text-slate-800 underline decoration-slate-300 underline-offset-2">{roster[pSlot]}</button>
                                                        {/* [최신] 전체/초진 예약 병기 */}
                                                        <div className="text-[9px] font-bold mt-0.5 flex justify-center gap-1.5">
                                                            <span className="text-slate-600">전 {patientCounts[`${pSlot}-total`] || 0}</span>
                                                            <span className="text-rose-600 font-bold">초 {patientCounts[`${pSlot}-new`] || 0}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-1.5">
                                                        <div className="flex gap-1.5">
                                                            <button onClick={() => handleCall(roster[`${shift}-outp-${i}-m1`])} className={`flex-1 bg-slate-50 py-2 rounded-lg border border-slate-100 ${getNameColorClass(roster[`${shift}-outp-${i}-m1`])}`}>{roster[`${shift}-outp-${i}-m1`] || '-'}</button>
                                                            <button onClick={() => handleCall(roster[`${shift}-outp-${i}-m2`])} className={`flex-1 bg-slate-50 py-2 rounded-lg border border-slate-100 ${getNameColorClass(roster[`${shift}-outp-${i}-m2`])}`}>{roster[`${shift}-outp-${i}-m2`] || '-'}</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* [최신] 고정 업무 텍스트 확대 */}
                                        {fixedTasks.map(task => (
                                            <tr key={task} className="bg-slate-50/20">
                                                <td className="p-2 w-[90px] font-black text-slate-600 border-r border-slate-100 text-[13px] leading-tight">{task}</td>
                                                <td className="p-2">
                                                    <div className="flex gap-1.5">
                                                        <button onClick={() => handleCall(roster[`${shift}-${task}-m1`])} className={`flex-1 bg-white py-2.5 rounded-lg border border-slate-200 ${getNameColorClass(roster[`${shift}-${task}-m1`])}`}>{roster[`${shift}-${task}-m1`] || '-'}</button>
                                                        <button onClick={() => handleCall(roster[`${shift}-${task}-m2`])} className={`flex-1 bg-white py-2.5 rounded-lg border border-slate-200 ${getNameColorClass(roster[`${shift}-${task}-m2`])}`}>{roster[`${shift}-${task}-m2`] || '-'}</button>
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

                {/* [최신] 공지사항 저장 버튼 섹션 */}
                <section className="bg-indigo-50/50 p-5 rounded-[2.5rem] border border-indigo-100 shadow-inner relative">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-[10px] font-black text-indigo-600 flex items-center gap-2 uppercase tracking-tight">📢 오늘의 공지사항</h3>
                        {isMemoDirty && <span className="text-[9px] text-rose-500 font-bold animate-pulse">저장되지 않음</span>}
                    </div>
                    <textarea
                        className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-bold text-slate-700 placeholder:text-indigo-200 resize-none min-h-[100px] mb-2"
                        placeholder="내용을 입력하세요..."
                        value={memo}
                        onChange={(e) => { setMemo(e.target.value); setIsMemoDirty(true); }}
                    />
                    <button
                        onClick={handleSaveMemo}
                        className={`w-full py-3 rounded-2xl font-black text-xs transition-all ${isMemoDirty ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400 cursor-default'}`}
                        disabled={!isMemoDirty}
                    >
                        공지사항 저장하기
                    </button>
                </section>

                {/* [복구] 주간 배치표 보기 버튼 (하단 이동) */}
                <button onClick={() => setShowWeekModal(true)} className="w-full bg-blue-50 text-blue-600 py-4 rounded-3xl font-black text-[11px] shadow-sm border border-blue-100 active:scale-95 transition-all mt-2">📅 주간 배치표 조회 및 인쇄 (PDF)</button>

                <div className="flex gap-3 mt-4">
                    <button onClick={() => router.push('/')} className="flex-1 bg-white py-4 rounded-3xl font-black text-xs text-slate-500 shadow-sm border border-slate-200 active:bg-slate-100 transition-colors">🏠 메인 페이지</button>
                    <button onClick={() => router.push('/edit')} className="flex-1 bg-slate-800 py-4 rounded-3xl font-black text-xs text-white shadow-lg active:bg-slate-900 transition-colors">📝 배치표 작성</button>
                </div>
            </div>

            {/* 날짜 선택 모달 */}
            {showDateModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full">
                        <h3 className="text-lg font-black text-slate-800 mb-2 text-center">날짜 이동</h3>
                        <div className="calendar-modal mb-6 border rounded-2xl overflow-hidden scale-90">
                            <Calendar onChange={(date) => { setSelectedDate(date); setShowDateModal(false); }} value={selectedDate} calendarType="gregory" locale="ko-KR" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setSelectedDate(new Date()); setShowDateModal(false); }} className="flex-1 py-4 rounded-2xl font-bold bg-blue-50 text-blue-600">오늘로 가기</button>
                            <button onClick={() => setShowDateModal(false)} className="flex-1 py-4 rounded-2xl font-bold bg-slate-100 text-slate-600">닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 주간 배치표 모달 */}
            {showWeekModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full">
                        <h3 className="text-lg font-black text-slate-800 mb-2 text-center uppercase italic">Weekly Print</h3>
                        <p className="text-center text-[11px] text-slate-400 font-bold mb-4 italic">출력할 주의 날짜를 선택하세요.</p>
                        <div className="calendar-modal mb-6 border rounded-2xl overflow-hidden scale-90">
                            <Calendar onChange={(date) => { handleWeekPrint(date); setShowWeekModal(false); }} value={selectedDate} calendarType="gregory" locale="ko-KR" />
                        </div>
                        <button onClick={() => setShowWeekModal(false)} className="w-full py-4 rounded-2xl font-bold bg-slate-100 text-slate-600">닫기</button>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .react-calendar { border: none !important; font-family: inherit !important; width: 100% !important; }
                .react-calendar__tile--active { background: #2563eb !important; border-radius: 12px !important; }
                .react-calendar__tile--now { background: #eff6ff !important; color: #2563eb !important; border-radius: 12px !important; }
                @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
            `}</style>
        </div>
    );
}