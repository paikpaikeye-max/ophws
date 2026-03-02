"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [todayInfo, setTodayInfo] = useState({ duty: "-", oncall: "-", retina: "-", vacation: [] });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 화면 표시용 날짜
  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });

  useEffect(() => {
    async function fetchData() {
      // 1. 한국 표준시(KST) 기준 현재 시간 및 타겟 날짜 계산
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const kstNow = new Date(utc + (9 * 60 * 60 * 1000));

      const targetDate = new Date(kstNow);
      if (kstNow.getHours() < 8) {
        targetDate.setDate(kstNow.getDate() - 1);
      }

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // 2. 구성원(연락처 포함) 및 스케줄 동시 조회
      const [membersRes, scheduleRes] = await Promise.all([
        supabase.from('members').select('name, phone'),
        supabase.from('daily_schedules').select('roster_data').eq('work_date', dateStr).single()
      ]);

      if (membersRes.data) setMembers(membersRes.data);

      if (!scheduleRes.error && scheduleRes.data?.roster_data) {
        const roster = scheduleRes.data.roster_data;
        setTodayInfo({
          duty: roster["NIGHT-DUTY"] || "미정",
          oncall: roster["ONCALL-PROF"] || "미정",
          retina: roster["RETINA-ONCALL"] || "미정",
          vacation: Array.isArray(roster["VACATION-SLOT"]) ? roster["VACATION-SLOT"] : []
        });
      } else {
        setTodayInfo({ duty: "미정", oncall: "미정", retina: "미정", vacation: [] });
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // 전화번호 찾기 함수
  const getPhoneByName = (name) => {
    const cleanName = name.split('(')[0]; // 메모 제외 이름만 추출
    const member = members.find(m => m.name === cleanName);
    return member?.phone || null;
  };

  // 전화 걸기 핸들러
  const handleCall = (name) => {
    const phone = getPhoneByName(name);
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      alert("등록된 전화번호가 없습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-6">
      <header className="text-center mb-10 animate-fade-in">
        <div className="inline-block bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full mb-4 tracking-widest uppercase">
          Smart Medical Roster
        </div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">
          OPHWS <span className="text-blue-600">Schedule</span>
        </h1>
        <p className="text-slate-500 font-medium text-sm">{todayStr}</p>
      </header>

      <div className="w-full max-w-md space-y-4">
        {/* Status Widget */}
        <section className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
            Today's Status (오전 8시 기준)
          </h3>

          {/* 당직 인원 (클릭 시 전화 기능) */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "당직", name: todayInfo.duty, color: "text-slate-800" },
              { label: "온콜", name: todayInfo.oncall, color: "text-blue-600" },
              { label: "망막", name: todayInfo.retina, color: "text-indigo-600" }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => !loading && item.name !== "미정" && handleCall(item.name)}
                className="text-center p-2 bg-slate-50 rounded-2xl border border-slate-100 active:scale-95 transition-transform"
              >
                <p className="text-[10px] font-bold text-slate-400 mb-1">{item.label}</p>
                <p className={`text-sm font-black underline decoration-dotted underline-offset-4 ${item.color}`}>
                  {loading ? "..." : item.name}
                </p>
              </button>
            ))}
          </div>

          {/* 휴가/오프 명단 (클릭 기능 없음) */}
          <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-100">
            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span>🏖️</span> 휴가 및 오프 명단
            </h4>
            <div className="flex flex-wrap gap-2">
              {todayInfo.vacation.length > 0 ? (
                todayInfo.vacation.map((name, i) => (
                  <span key={i} className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-xs font-bold text-rose-700 shadow-sm">
                    {name}
                  </span>
                ))
              ) : (
                <p className="text-[11px] text-rose-400 font-medium italic">오늘의 휴가자가 없습니다.</p>
              )}
            </div>
          </div>
        </section>

        {/* Navigation */}
        <nav className="space-y-3">
          <button onClick={() => router.push('/view')} className="group w-full bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-[2rem] shadow-lg shadow-blue-600/20 transition-all flex items-center justify-between overflow-hidden relative">
            <div className="text-left z-10">
              <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Viewer Mode</span>
              <h2 className="text-xl font-black italic">배치표 확인하기</h2>
            </div>
            <span className="text-3xl opacity-30 group-hover:translate-x-2 transition-transform z-10">🔍</span>
            <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white/10 to-transparent"></div>
          </button>

          <button onClick={() => router.push('/edit')} className="group w-full bg-white hover:bg-slate-800 hover:text-white text-slate-800 p-6 rounded-[2rem] shadow-md border border-slate-200 transition-all flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-500">Admin Mode</span>
              <h2 className="text-xl font-black italic">배치표 작성 및 수정</h2>
            </div>
            <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">📝</span>
          </button>

          <button onClick={() => router.push('/settings')} className="group w-full bg-slate-100 hover:bg-slate-200 text-slate-600 p-5 rounded-[2rem] transition-all flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
              <span className="text-xl">⚙️</span>
              <h2 className="text-sm font-black italic">구성원 편집 및 관리</h2>
            </div>
            <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity font-bold">Manage Members ◀</span>
          </button>
        </nav>
      </div>

      <footer className="mt-16 text-center">
        <p className="text-[10px] font-bold text-slate-300 tracking-widest uppercase mb-1">Ophws Medical Information System</p>
        <p className="text-[9px] text-slate-400 font-medium">© 2026 OPHWS Roster v2.0. All Rights Reserved.</p>
      </footer>

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
      `}</style>
    </div>
  );
}