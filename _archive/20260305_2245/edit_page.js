"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragOverlay, rectIntersection } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { useRouter } from 'next/navigation';

// --- 1. 드래그 가능한 칩 컴포넌트 ---
function DraggableChip({ name, id, isOverlay = false, type = "staff", role = "", onRemove }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id, data: { name, type, role, sourceId: id.startsWith('slot-') ? id.replace('slot-', '') : null }
  });
  const isPlaced = id.startsWith('slot-');
  const isResident = role === 'Resident' || (type === 'staff' && role === 'Resident');
  const textColor = isResident ? 'text-blue-600' : 'text-slate-700';
  const bgColor = type === 'prof' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200';
  const chipStyle = `relative px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing text-[12px] font-bold shadow-md border transition-all text-center flex items-center justify-center ${isOverlay ? 'bg-blue-600 text-white border-blue-700 scale-105 shadow-2xl w-[90px]' : 'w-full'} ${!isOverlay && isDragging ? 'opacity-0' : `${bgColor} ${isOverlay ? '' : textColor} hover:border-blue-400`}`;
  return (
    <div ref={setNodeRef} className={chipStyle} {...listeners} {...attributes}>
      {name}
      {isPlaced && !isOverlay && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-400 hover:bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm border border-white transition-colors cursor-pointer">✕</button>
      )}
    </div>
  );
}

// --- 2. 드롭 가능한 슬롯 컴포넌트 ---
function DroppableSlot({ id, children, placeholder = "배치", acceptType, disabled = false }) {
  const { isOver, setNodeRef, active } = useDroppable({ id, data: { acceptType }, disabled });
  const canDrop = !disabled && (active?.data?.current?.type === acceptType || !acceptType);
  return (
    <div ref={setNodeRef} className={`relative min-h-[42px] w-full flex flex-wrap gap-1 p-1 items-center justify-center rounded-lg border-2 transition-all ${disabled ? 'bg-slate-200 border-slate-300 opacity-50' : isOver && canDrop ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-slate-100/50'}`}>
      {!disabled && (children || <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{placeholder}</span>)}
      {disabled && <span className="text-[10px] text-slate-400 font-bold italic">휴진</span>}
    </div>
  );
}

export default function UltimateScheduleEditor() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const authChecked = useRef(false); // 중복 실행 방지를 위한 Ref

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [members, setMembers] = useState([]);
  const [profs, setProfs] = useState([]);
  const [roster, setRoster] = useState({});
  const [patientCounts, setPatientCounts] = useState({});
  const [closedSlots, setClosedSlots] = useState({});
  const [activeItem, setActiveItem] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [modalDate, setModalDate] = useState(new Date());
  const [amCount, setAmCount] = useState(2);
  const [pmCount, setPmCount] = useState(1);
  const [savedDates, setSavedDates] = useState([]);

  const fixedTasks = ['전공의외래', '총외래업무', '검안실', '주사/처치', '수술실(OR)'];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2500);
  };

  const loadSchedule = async (targetDate, isAutoLoad = false) => {
    const dateStr = formatDate(targetDate);
    const { data, error } = await supabase.from('daily_schedules').select('*').eq('work_date', dateStr).single();
    if (error || !data) {
      if (!isAutoLoad) alert("기록이 없습니다.");
      setRoster({}); setPatientCounts({}); setClosedSlots({}); setAmCount(2); setPmCount(1);
      return;
    }
    setRoster(data.roster_data || {});
    setPatientCounts(data.patient_counts || {});
    setClosedSlots(data.closed_slots || {});
    setAmCount(data.am_count || 2);
    setPmCount(data.pm_count || 1);
    if (!isAutoLoad) showToast(`${dateStr} 데이터를 불러왔습니다.`);
  };

  const fetchSavedDates = async () => {
    const { data, error } = await supabase.from('daily_schedules').select('work_date, is_temporary');
    if (!error && data) {
      setSavedDates(data.map(item => ({ date: item.work_date, isTemp: item.is_temporary })));
    }
  };

  const saveSchedule = async (isTemp = false) => {
    const { error } = await supabase.from('daily_schedules').upsert({
      work_date: formatDate(selectedDate), roster_data: roster, patient_counts: patientCounts,
      closed_slots: closedSlots, am_count: amCount, pm_count: pmCount, is_temporary: isTemp, updated_at: new Date()
    });
    if (error) alert("저장 실패: " + error.message);
    else { showToast(isTemp ? "임시 저장되었습니다" : "최종 저장이 완료되었습니다"); fetchSavedDates(); }
  };

  const resetEverythingExceptProf = () => {
    setRoster(prev => {
      const next = {};
      Object.keys(prev).forEach(key => { if (key.includes('prof-slot')) next[key] = prev[key]; });
      return next;
    });
    setPatientCounts({}); setClosedSlots({});
    showToast("진료 외 모든 정보가 초기화되었습니다.");
  };

  // 1. 보안 인증 로직 (최초 1회 실행)
  useEffect(() => {
    if (authChecked.current) return;
    authChecked.current = true;

    async function checkAuth() {
      const { data } = await supabase.from('settings').select('value').eq('key', 'admin_password').single();
      const adminPassword = data?.value || "1234";
      const userInput = window.prompt("관리자 비밀번호를 입력하세요.");

      if (userInput === adminPassword) {
        setIsAuthorized(true);
        setMounted(true); // 인증 성공 후에만 마운트 상태 활성화
      } else {
        alert("비밀번호가 틀렸습니다.");
        router.replace('/');
      }
    }
    checkAuth();
  }, [router]);

  // 2. 기본 데이터 로드 로직
  useEffect(() => {
    if (!isAuthorized) return;
    async function fetchBaseData() {
      const { data: mems } = await supabase.from('members').select('*').eq('is_active', true).order('display_order', { ascending: true });
      const { data: pfs } = await supabase.from('professors').select('*').eq('is_active', true).order('display_order', { ascending: true });
      setMembers(mems || []); setProfs(pfs || []);
    }
    fetchBaseData();
    fetchSavedDates();
  }, [isAuthorized]);

  // 3. 선택 날짜 변경 시 로드 로직
  useEffect(() => {
    if (mounted && isAuthorized) loadSchedule(selectedDate, true);
  }, [selectedDate, mounted, isAuthorized]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over) return;
    const targetId = over.id;
    const sourceId = active.data.current.sourceId;
    const { name } = active.data.current;
    let displayName = name;
    if (targetId === 'VACATION-SLOT') {
      const memo = window.prompt(name + " 님의 휴가 메모를 입력하세요 (예: 오전반차)");
      if (memo !== null && memo.trim() !== "") displayName = name + "(" + memo.trim() + ")";
    }
    setRoster(prev => {
      const next = { ...prev };
      if (sourceId) {
        if (sourceId === 'VACATION-SLOT') next[sourceId] = (next[sourceId] || []).filter(n => n !== name && !n.startsWith(name + "("));
        else delete next[sourceId];
      }
      if (targetId === 'VACATION-SLOT') {
        const arr = Array.isArray(next[targetId]) ? next[targetId] : [];
        if (!arr.includes(displayName)) next[targetId] = [...arr, displayName];
      } else next[targetId] = displayName;
      return next;
    });
  };

  const removeChip = (slotId, fullName) => {
    setRoster(prev => {
      const n = { ...prev };
      if (slotId === "VACATION-SLOT") n[slotId] = (n[slotId] || []).filter(nx => nx !== fullName);
      else delete n[slotId];
      return n;
    });
  };

  const getRoleByName = (name) => {
    const m = members.find(m => m.name === name);
    return m ? m.role : "";
  };

  if (!mounted || !isAuthorized) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={(e) => setActiveItem(e.active.data.current)} onDragEnd={handleDragEnd} autoScroll={false}>
      <div className="h-screen bg-[#f8fafc] flex overflow-hidden font-sans select-none relative text-slate-900">
        <aside className="w-80 min-w-[320px] bg-[#1e293b] text-white p-4 flex flex-col shadow-2xl z-20 border-r border-slate-700 text-center">
          <h1 className="text-xl font-black mb-4 text-blue-400 tracking-tighter uppercase tracking-widest cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push('/')}>Ophws schedule</h1>
          <Calendar onChange={setSelectedDate} value={selectedDate} calendarType="gregory" formatDay={(l, d) => d.getDate()} className="custom-calendar mb-6 scale-95" tileClassName={({ date, view }) => {
            if (view !== 'month') return;
            const dateStr = formatDate(date);
            const record = savedDates.find(d => d.date === dateStr);
            if (record) return record.isTemp ? 'has-temp' : 'has-final';
          }} />
          <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-1">
            <div className="grid grid-cols-3 gap-2 px-1">
              {['교수', '전공의', 'PA'].map(roleLabel => (
                <section key={roleLabel} className="space-y-2">
                  <h3 className="text-[12px] font-black text-slate-400 uppercase">{roleLabel}</h3>
                  {(roleLabel === '교수' ? profs.map(p => ({ id: p.id, name: p.initial, type: 'prof', role: 'Professor' })) :
                    members.filter(m => m.role === (roleLabel === '전공의' ? 'Resident' : 'PA')).map(m => ({ id: m.id, name: m.name, type: 'staff', role: m.role }))
                  ).map(item => <DraggableChip key={item.id} id={`${item.type}-${item.id}`} name={item.name} type={item.type} role={item.role} />)}
                </section>
              ))}
            </div>
          </div>
          <div className="mt-auto pt-4 space-y-2 border-t border-slate-700">
            <button onClick={() => router.push('/settings')} className="w-full py-3 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 transition-all flex items-center justify-center gap-2 text-sm">⚙️ 구성원 편집</button>
            <button onClick={() => router.push('/')} className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 text-sm">🏠 메인 페이지</button>
          </div>
        </aside>
        <main className="flex-1 p-6 overflow-y-auto bg-[#f8fafc]">
          <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{formatDate(selectedDate)}</h2>
              <div className="flex gap-2">
                <button onClick={resetEverythingExceptProf} className="bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-200 transition-all leading-tight">진료일정 외<br />전체 초기화</button>
                <button onClick={() => setShowLoadModal(true)} className="bg-slate-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all leading-tight">이전 배치<br />불러오기</button>
                <button onClick={() => saveSchedule(true)} className="bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-600">임시저장</button>
                <button onClick={() => saveSchedule(false)} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700">최종 저장</button>
              </div>
            </div>
            <section className="bg-rose-50/50 p-6 rounded-[2.5rem] border border-rose-100">
              <h3 className="text-base font-black text-rose-600 mb-3 flex items-center gap-2"><span className="w-2 h-5 bg-rose-500 rounded-full"></span> 휴가 / 오프 명단</h3>
              <DroppableSlot id="VACATION-SLOT" placeholder="" isMulti={true}>
                {Array.isArray(roster["VACATION-SLOT"]) && roster["VACATION-SLOT"].map(fullName => (
                  <div key={fullName} className="min-w-[75px]">
                    <DraggableChip id={"slot-VACATION-SLOT-" + fullName} name={fullName} role={getRoleByName(fullName.split('(')[0])} onRemove={() => removeChip("VACATION-SLOT", fullName)} />
                  </div>
                ))}
              </DroppableSlot>
            </section>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {['오전', '오후'].map(shift => (
                <div key={shift} className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
                  <div className={`p-4 px-6 ${shift === '오전' ? 'bg-blue-600' : 'bg-indigo-700'} text-white font-black flex justify-between items-center`}>
                    <span className="text-base">{shift} 배치</span>
                    <div className="flex items-center gap-3 bg-black/10 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] font-bold opacity-80 tracking-tighter whitespace-nowrap">외래 추가/제거</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => shift === '오전' ? setAmCount(c => c + 1) : setPmCount(c => c + 1)} className="w-6 h-6 bg-white/20 rounded-md font-bold text-base hover:bg-white/40">+</button>
                        <button onClick={() => shift === '오전' ? setAmCount(c => Math.max(1, c - 1)) : setPmCount(c => Math.max(1, c - 1))} className="w-6 h-6 bg-white/20 rounded-md font-bold text-base hover:bg-white/40">-</button>
                      </div>
                    </div>
                  </div>
                  <table className="w-full text-[12px] border-collapse"><tbody className="divide-y divide-slate-100">
                    {[...Array(shift === '오전' ? amCount : pmCount)].map((_, i) => {
                      const pSlot = `${shift}-prof-slot-${i}`;
                      const isDisabled = closedSlots[pSlot];
                      return (
                        <tr key={i} className={`${isDisabled ? 'bg-rose-50/40' : 'bg-indigo-50/30'} transition-colors`}>
                          <td className="p-2 w-28"><DroppableSlot id={pSlot} acceptType="prof" placeholder="교수">{roster[pSlot] && <DraggableChip id={`slot-${pSlot}`} name={roster[pSlot]} type="prof" onRemove={() => removeChip(pSlot)} />}</DroppableSlot></td>
                          <td className="p-2 w-48 flex gap-1.5 justify-center items-center">
                            <div className="flex flex-col items-center"><span className="text-[8px] font-black text-yellow-700 mb-0.5 uppercase">전체예약</span><input disabled={isDisabled} className="w-14 h-8 border-2 border-yellow-100 rounded-lg text-center font-bold text-xs disabled:bg-slate-200" value={patientCounts[`${pSlot}-total`] || ''} onChange={(e) => setPatientCounts({ ...patientCounts, [`${pSlot}-total`]: e.target.value })} /></div>
                            <div className="flex flex-col items-center"><span className="text-[8px] font-black text-red-600 mb-0.5 uppercase">초진예약</span><input disabled={isDisabled} className="w-14 h-8 border-2 border-red-50 rounded-lg text-center font-bold text-xs text-red-600 disabled:bg-slate-200" value={patientCounts[`${pSlot}-new`] || ''} onChange={(e) => setPatientCounts({ ...patientCounts, [`${pSlot}-new`]: e.target.value })} /></div>
                            <div className="flex flex-col items-center ml-1"><span className="text-[8px] font-black text-slate-400 mb-0.5 uppercase">휴진</span><input type="checkbox" checked={!!isDisabled} onChange={() => setClosedSlots({ ...closedSlots, [pSlot]: !isDisabled })} className="w-4 h-4 accent-rose-500 cursor-pointer" /></div>
                          </td>
                          {['m1', 'm2'].map(m => {
                            const id = `${shift}-outp-${i}-${m}`;
                            return <td key={m} className="p-1 px-3 border-l border-dashed border-slate-200"><DroppableSlot id={id} acceptType="staff" disabled={isDisabled}>{roster[id] && <DraggableChip id={`slot-${id}`} name={roster[id]} role={getRoleByName(roster[id])} onRemove={() => removeChip(id)} />}</DroppableSlot></td>
                          })}
                        </tr>
                      );
                    })}
                    {fixedTasks.map(task => (
                      <tr key={task}><td className="p-4 font-black text-slate-700 pl-6 text-[13px]">{task}</td><td className="p-4 text-center text-slate-300 font-bold">-</td>
                        <td colSpan={2} className="p-1 px-3 border-l border-dashed border-slate-200">
                          <div className={`grid ${task === '수술실(OR)' ? 'grid-cols-4' : 'grid-cols-2'} gap-2 w-full h-full min-h-[42px]`}>
                            {['m1', 'm2', ...(task === '수술실(OR)' ? ['m3', 'm4'] : [])].map(m => {
                              const id = `${shift}-${task}-${m}`;
                              return <DroppableSlot key={m} id={id} acceptType="staff">{roster[id] && <DraggableChip id={`slot-${id}`} name={roster[id]} role={getRoleByName(roster[id])} onRemove={() => removeChip(id)} />}</DroppableSlot>
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[{ label: '당직전공의', id: 'NIGHT-DUTY', type: 'staff' }, { label: '당직교수', id: 'ONCALL-PROF', type: 'prof' }, { label: '망막온콜', id: 'RETINA-ONCALL', type: 'prof' }].map(item => (
                <div key={item.id} className="bg-[#1e293b] p-6 rounded-[2.5rem] text-white shadow-xl border border-slate-700">
                  <p className="text-[13px] font-black text-slate-400 mb-4 uppercase text-center tracking-widest">{item.label}</p>
                  <DroppableSlot id={item.id} acceptType={item.type}>
                    {roster[item.id] && <DraggableChip id={`slot-${item.id}`} name={roster[item.id]} type={item.type} role={getRoleByName(roster[item.id])} onRemove={() => removeChip(item.id)} />}
                  </DroppableSlot>
                </div>
              ))}
            </div>
          </div>
          {showLoadModal && (
            <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full animate-fade-in-up">
                <h3 className="text-xl font-black text-slate-800 mb-6 text-center">불러올 날짜 선택</h3>
                <div className="calendar-modal mb-6 border rounded-2xl overflow-hidden"><Calendar onChange={setModalDate} value={modalDate} calendarType="gregory" /></div>
                <div className="flex gap-3">
                  <button onClick={() => setShowLoadModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">취소</button>
                  <button onClick={() => { loadSchedule(modalDate); setShowLoadModal(false); }} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg transition-all">불러오기</button>
                </div>
              </div>
            </div>
          )}
          {toast.show && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up">
              <div className="bg-slate-800 text-white px-8 py-3 rounded-2xl shadow-2xl border border-blue-500 font-bold text-sm">✅ {toast.message}</div>
            </div>
          )}
        </main>
        {mounted && createPortal(
          <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
            {activeItem ? <DraggableChip name={activeItem.name} id="overlay" isOverlay={true} type={activeItem.type} role={activeItem.role} /> : null}
          </DragOverlay>,
          document.body
        )}
      </div>
      <style jsx global>{`
        .custom-calendar { background: #2d3748 !important; border: none !important; border-radius: 1.5rem; width: 100% !important; padding: 10px; font-size: 14px !important; }
        .react-calendar__tile { padding: 12px 8px !important; font-size: 14px !important; color: white !important; }
        .react-calendar__tile--active { background: #2563eb !important; border-radius: 0.75rem; }
        .has-temp {background: #fff7ed !important;color: #d97706 !important;border: 1px solid #fbbf24 !important; font-weight: 800;;}
        .has-final {background: #eff6ff !important;color: #2563eb !important;border: 1px solid #60a5fa !important; font-weight: 800;}
        .react-calendar__navigation button { color: white !important; font-weight: bold; font-size: 16px; }
        .calendar-modal .react-calendar { background: white !important; font-size: 14px !important; }
        .calendar-modal .react-calendar__tile { color: #334155 !important; }
        .calendar-modal .react-calendar__navigation button { color: #334155 !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 10px; }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </DndContext>
  );
}