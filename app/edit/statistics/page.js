"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { buildRosterStatistics, defaultStatisticsRange, fetchStatisticsSchedules, validateStatisticsRange, RESIDENT_CATEGORIES, PA_CATEGORIES, DUTY_WEEKDAYS, OTHER_CATEGORY } from '@/lib/rosterStatistics';

function categoriesWithOther(categories, rows) {
  return rows.some(row => row.counts[OTHER_CATEGORY]) ? [...categories, OTHER_CATEGORY] : categories;
}

function DistributionTable({ title, subtitle, rows, categories, showShare = false, showWorkdays = false, showWeekdayHoliday = false }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-6 py-5"><h2 className="text-base font-black text-slate-800">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></header>
      {rows.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-400">선택한 기간에 해당 배치 기록이 없습니다.</p> :
        <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr><th scope="col" className="sticky left-0 z-10 bg-slate-50 px-6 py-4 text-left">이름</th>
            {categories.map(category => <th key={category} scope="col" className="px-5 py-4 text-right">{category}</th>)}{showWeekdayHoliday && <th scope="col" className="px-5 py-4 text-right">평일 공휴일(추정)</th>}<th scope="col" className="px-6 py-4 text-right">합계</th>{showWorkdays && <th scope="col" className="px-6 py-4 text-right">실 근무일 / 근무일</th>}</tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.name} className="group hover:bg-blue-50/40"><th scope="row" className="sticky left-0 bg-white px-6 py-4 text-left font-bold group-hover:bg-blue-50">{row.name}</th>
            {categories.map(category => { const count = row.counts[category] || 0; return <td key={category} className="px-5 py-4 text-right tabular-nums"><span className={count ? 'font-bold text-slate-700' : 'text-slate-300'}>{count}</span>{showShare && <span className="ml-2 text-xs text-slate-400">{row.total ? `${(count / row.total * 100).toFixed(1)}%` : '—'}</span>}</td>; })}
            {showWeekdayHoliday && <td className="px-5 py-4 text-right font-bold tabular-nums text-amber-700">{row.weekdayHoliday || 0}</td>}
            <td className="px-6 py-4 text-right font-black tabular-nums text-blue-700">{row.total}</td>{showWorkdays && <td className="px-6 py-4 text-right tabular-nums"><span className="font-bold text-slate-700">{row.workdays.actual} / {row.workdays.total}일</span></td>}</tr>)}</tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50 font-bold"><tr><th scope="row" className="sticky left-0 bg-slate-50 px-6 py-4 text-left">합계</th>{categories.map(category => <td key={category} className="px-5 py-4 text-right tabular-nums">{rows.reduce((sum, row) => sum + (row.counts[category] || 0), 0)}</td>)}{showWeekdayHoliday && <td className="px-5 py-4 text-right tabular-nums text-amber-700">{rows.reduce((sum, row) => sum + (row.weekdayHoliday || 0), 0)}</td>}<td className="px-6 py-4 text-right tabular-nums text-blue-700">{rows.reduce((sum, row) => sum + row.total, 0)}</td>{showWorkdays && <td className="px-6 py-4 text-right text-slate-400">—</td>}</tr></tfoot>
        </table></div>}
    </section>
  );
}

export default function RosterStatisticsPage() {
  const [range, setRange] = useState(() => defaultStatisticsRange());
  const [includeTemporary, setIncludeTemporary] = useState(false);
  const [query, setQuery] = useState(() => ({ ...defaultStatisticsRange(), includeTemporary: false }));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [schedules, membersResponse] = await Promise.all([
          fetchStatisticsSchedules(supabase, query),
          supabase.from('members').select('name,role,is_active,display_order').order('display_order', { ascending: true }),
        ]);
        if (membersResponse.error) throw new Error(membersResponse.error.message);
        const statistics = buildRosterStatistics(schedules, membersResponse.data || [], query);
        if (!cancelled && id === requestId.current) setResult(statistics);
      } catch (problem) {
        if (!cancelled && id === requestId.current) { setError(problem.message); setResult(null); }
      } finally {
        if (!cancelled && id === requestId.current) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [query]);

  function submit(event) {
    event.preventDefault();
    const invalid = validateStatisticsRange(range.start, range.end);
    setValidation(invalid);
    if (!invalid) { setLoading(true); setQuery({ ...range, includeTemporary }); }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-widest text-blue-600">OPHWS SCHEDULE</p><h1 className="mt-2 text-3xl font-black tracking-tight">기간별 배치 통계</h1><p className="mt-2 text-sm text-slate-500">저장된 배치를 비교하며 새 배치표를 작성하세요.</p></div><Link href="/edit" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:border-blue-300">배치표 작성</Link></header>
        <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end gap-4"><label className="space-y-2 text-xs font-bold text-slate-500"><span className="block">시작일</span><input type="date" required value={range.start} onChange={event => setRange({ ...range, start: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800" /></label>
            <label className="space-y-2 text-xs font-bold text-slate-500"><span className="block">종료일</span><input type="date" required value={range.end} onChange={event => setRange({ ...range, end: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800" /></label>
            <label className="flex min-h-11 items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={includeTemporary} onChange={event => setIncludeTemporary(event.target.checked)} className="h-4 w-4 accent-blue-600" />임시저장 포함</label>
            <button type="submit" disabled={loading} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? '조회 중…' : '통계 조회'}</button>
            <button type="button" disabled={loading} onClick={() => { const defaults = defaultStatisticsRange(); setRange(defaults); setIncludeTemporary(false); setValidation(''); setLoading(true); setQuery({ ...defaults, includeTemporary: false }); }} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 disabled:opacity-50">최근 3개월</button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">시작일과 종료일을 모두 포함합니다. 기본값은 한국 날짜 기준 최근 3개월이며, 최종 저장본만 집계합니다.</p>
          {validation && <p role="alert" className="mt-3 text-sm font-bold text-rose-600">{validation}</p>}
        </form>
        {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">통계를 불러오지 못했습니다: {error}<button type="button" onClick={() => setQuery({ ...query })} className="ml-3 font-bold underline">다시 시도</button></div>}
        {loading ? <div role="status" className="rounded-3xl border border-slate-200 bg-white py-16 text-center text-sm font-bold text-slate-500">배치 기록을 집계하고 있습니다…</div> : result && <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-slate-500"><span className="font-bold text-slate-700">조회 기간 {query.start} ~ {query.end}</span><span>저장된 날짜 {result.scheduleCount}일</span><span>{query.includeTemporary ? `임시저장 ${result.temporaryCount}일 포함` : '최종 저장본만'}</span>{result.firstDate && <span>기록 범위 {result.firstDate} ~ {result.lastDate}</span>}</div>
          <p className="px-1 text-xs text-slate-500">기간 내 평일 근무일 {result.workingDays}일 · 주간 배치 없는 평일 {result.weekdayHolidays}일(공휴일 추정·미작성 포함)</p>
          <p className="px-1 text-xs text-slate-500">중복 배치 {result.collapsedHalfDays}반나절은 우선순위로 1회 집계합니다. 업무 합계 = 실 근무일 × 2입니다.</p>
          {result.excludedWeekendPlacementDates.length > 0 && <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">주말에 입력된 주간 배치는 일과 통계에서 제외했습니다: {result.excludedWeekendPlacementDates.join(', ')}. 주말 당직은 당직표에 정상 집계합니다.</p>}
          <DistributionTable title="전공의 · 일과 중 배치" subtitle="평일 오전·오후별 대표 업무 1회. 배치된 반나절마다 실 근무일 0.5일입니다." rows={result.residents} categories={categoriesWithOther(RESIDENT_CATEGORIES, result.residents)} showShare showWorkdays />
          <DistributionTable title="전공의 · 요일별 당직" subtitle="평일 공휴일은 주말을 제외한 주간 배치 없는 평일입니다. 요일별 횟수에 이미 포함되어 합계에 중복 가산하지 않습니다." rows={result.duties} categories={DUTY_WEEKDAYS} showWeekdayHoliday />
          <DistributionTable title="PA · 일과 중 배치" subtitle="평일 오전·오후별 대표 업무 1회. 수술실 등 분류 밖 배치는 기타 업무로 표시합니다." rows={result.pas} categories={categoriesWithOther(PA_CATEGORIES, result.pas)} showShare showWorkdays />
          <div className="rounded-2xl bg-slate-100 px-5 py-4 text-xs leading-6 text-slate-500"><p>같은 사람의 같은 반나절 중복 배치는 수술실 → 교수외래 → 나머지 업무 순서로 대표 업무 하나만 셉니다. 나머지 업무끼리 겹치는 예외는 전공의외래+총외래업무 → 검안실 → 주사+처치 순서로 셉니다. 휴진 교수외래와 차지표는 제외합니다.</p><p>근무일: 월~금 중 교수외래·전공의외래·총외래업무·수술실·검안실·주사/처치 등 주간 배치가 하나라도 있는 날입니다. 모든 주간 배치가 없는 평일은 공휴일로 추정하며, 미작성·미확정 날짜도 포함될 수 있습니다.</p><p>실 근무일: 개인의 평일 오전·오후 배치 유무로 반나절마다 0.5일을 합산합니다. 휴가·오프 메모와 배치가 함께 있으면 배치를 기준으로 계산하며 메모로 별도 차감하지 않습니다. PA 수술실처럼 기본 분류 밖 배치는 기타 업무에 포함해 업무 합계와 근무일을 일치시킵니다. 분모는 기간의 공통 근무일 수이며 전입·전출일을 별도로 추정하지 않습니다.</p><p>비활성 구성원도 해당 기간에 기록이 있으면 표시합니다. 각 표에서 배치가 없는 구성원은 생략합니다. 당직의 평일 공휴일 열은 월~금 당직의 부분 집계입니다.</p>
            {result.inferredResidents.length > 0 && <p>현재 명단에 없지만 당직전공의 기록으로 확인한 구성원: {result.inferredResidents.join(', ')}</p>}
            {result.unknownNames.length > 0 && <p className="font-bold text-amber-700">직군을 확인할 수 없어 제외한 이름: {result.unknownNames.join(', ')}. 구성원 명단의 직군을 확인해주세요.</p>}
          </div>
        </>}
      </div>
    </main>
  );
}
