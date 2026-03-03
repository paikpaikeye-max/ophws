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
    const [isMemoDirty, setIsMemoDirty] = useState(false); // [추가] 메모 수정 여부 상태
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

    // [추가] 이름에 따른 색상 클래스 반환 함수
    const getNameColorClass = (fullName) => {
        if (!fullName || fullName === '-') return 'text-slate-400';
        const cleanName = fullName.split('(')[0].trim();
        const staff = staffData.find(s => s.name === cleanName);
        if (staff?.role === 'Resident') return 'text-blue-600 font-bold'; // 전공의는 파란색
        return 'text-slate-800 font-bold'; // PA 및 기타는 검정색
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

    // [수정] 메모 저장 함수: 기존 roster 데이터와 함께 저장하도록 변경
    const handleSaveMemo = async () => {
        try {
            // 1. 현재 날짜의 데이터를 다시 한번 확인 (최신 roster 데이터 유지를 위해)
            const dateStr = formatDate(selectedDate);

            // 2. 업데이트 수행
            // roster가 빈 객체일 경우 에러 방지를 위해 기본값 {} 처리를 합니다.
            const { error } = await supabase.from('daily_schedules').upsert({
                work_date: dateStr,
                memo: memo,
                roster_data: roster || {}, // 기존 배치 데이터를 그대로 다시 넣어줌
                updated_at: new Date()
            }, { onConflict: 'work_date' });

            if (error) {
                // 만약 roster_data가 null이라서 생기는 에러라면 빈 객체라도 강제로 주입
                console.error("저장 에러 상세:", error);
                alert("저장 실패: " + error.message);
            } else {
                setIsMemoDirty(false);
                alert("공지사항이 저장되었습니다.");
            }
        } catch (err) {
            console.error(err);
            alert("알 수 없는 오류가 발생했습니다.");
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

    if (loading) return <div className="h-screen flex items-center justify-center font-bold">데이터 로딩 중...</div>;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans select-none">
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
                                <button key={name} onClick={() => handleCall(name)} className={`bg-white px-3 py-2 rounded-xl text-xs shadow-sm border border-slate-200 ${getNameColorClass(name)}`}>
                                    {name}
                                </button>
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
                                                            <button onClick={() => handleCall(roster[`${shift}-outp-${i}-m1`])} className={`flex-1 bg-slate-50 py-2.5 rounded-lg border border-slate-100 ${getNameColorClass(roster[`${shift}-outp-${i}-m1`])}`}>{roster[`${shift}-outp-${i}-m1`] || '-'}</button>
                                                            <button onClick={() => handleCall(roster[`${shift}-outp-${i}-m2`])} className={`flex-1 bg-slate-50 py-2.5 rounded-lg border border-slate-100 ${getNameColorClass(roster[`${shift}-outp-${i}-m2`])}`}>{roster[`${shift}-outp-${i}-m2`] || '-'}</button>
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

                <section className="grid grid-cols-2 gap-3">
                    {[{ label: '당직전공의', id: 'NIGHT-DUTY' }, { label: '온콜교수', id: 'ONCALL-PROF' }, { label: '망막온콜', id: 'RETINA-ONCALL' }].map(item => (
                        <div key={item.id} className="bg-slate-700 text-white p-4 rounded-3xl text-center shadow-md active:scale-95 transition-transform" onClick={() => handleCall(roster[item.id])}>
                            <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{item.label}</p>
                            <p className={`text-[15px] ${item.id === 'NIGHT-DUTY' ? 'text-blue-300' : 'text-white'} font-black`}>{roster[item.id] || '미정'}</p>
                        </div>
                    ))}
                </section>

                {/* [수정] 공지사항 섹션 - 저장 버튼 추가 */}
                <section className="bg-indigo-50/50 p-6 rounded-[2.5rem] border border-indigo-100 shadow-inner relative">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-black text-indigo-600 flex items-center gap-2 uppercase tracking-tight">📢 오늘의 공지사항</h3>
                        {isMemoDirty && <span className="text-[10px] text-rose-500 font-bold animate-pulse">저장되지 않음</span>}
                    </div>
                    <textarea
                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 placeholder:text-indigo-200 resize-none min-h-[120px] mb-2"
                        placeholder="내용을 입력하세요..."
                        value={memo}
                        onChange={(e) => { setMemo(e.target.value); setIsMemoDirty(true); }}
                    />
                    <button
                        onClick={handleSaveMemo}
                        className={`w-full py-3 rounded-2xl font-black text-sm transition-all ${isMemoDirty ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400 cursor-default'}`}
                        disabled={!isMemoDirty}
                    >
                        공지사항 저장하기
                    </button>
                </section>

                <div className="flex gap-3 mt-4">
                    <button onClick={() => router.push('/')} className="flex-1 bg-white py-4 rounded-3xl font-black text-slate-500 shadow-sm border border-slate-200 active:bg-slate-100 transition-colors">🏠 메인 페이지</button>
                    <button onClick={() => router.push('/edit')} className="flex-1 bg-slate-800 py-4 rounded-3xl font-black text-white shadow-lg active:bg-slate-900 transition-colors">📝 배치표 작성</button>
                </div>
            </div>

            {/* ... 날짜 모달 및 스타일 코드는 동일하므로 생략 ... */}
        </div>
    );
}