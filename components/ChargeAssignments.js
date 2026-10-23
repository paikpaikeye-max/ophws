"use client";

import { useDraggable, useDroppable } from '@dnd-kit/core';

function ChargeChip({ rowId, field, name, onRemove }) {
  const type = field === 'professor' ? 'prof' : 'staff';
  const role = field === 'residents' ? 'Resident' : field === 'pas' ? 'PA' : 'Professor';
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `charge-chip:${rowId}:${field}:${name}`,
    data: { name, type, role, chargeSource: { rowId, field } },
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      className={`group flex w-full cursor-grab items-center justify-between gap-1 rounded-lg border bg-white px-2 py-2 text-xs font-bold shadow-sm ${role === 'Resident' ? 'border-blue-100 text-blue-700' : 'border-slate-200 text-slate-700'} ${isDragging ? 'opacity-30' : ''}`}>
      <span>{name}</span>
      <button type="button" aria-label={`${name} 차지 해제`} onPointerDown={event => event.stopPropagation()}
        onClick={event => { event.stopPropagation(); onRemove(); }} className="rounded px-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">×</button>
    </div>
  );
}

function ChargeCell({ row, field, onChange }) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `charge-target:${row.id}:${field}`, data: { chargeTarget: { rowId: row.id, field } },
  });
  const expectedRole = field === 'residents' ? 'Resident' : field === 'pas' ? 'PA' : 'Professor';
  const accepted = field === 'professor' ? active?.data.current?.type === 'prof' : active?.data.current?.role === expectedRole;
  const values = field === 'professor' ? (row.professor ? [row.professor] : []) : row[field];
  const label = field === 'professor' ? '교수' : field === 'residents' ? '전공의' : 'PA';
  return (
    <div ref={setNodeRef} aria-label={`${row.professor || '미지정 교수'} ${label} 차지 칸`} className={`min-h-12 space-y-1 rounded-xl border-2 p-1 transition-colors ${isOver && accepted ? 'border-blue-400 bg-blue-50' : 'border-transparent bg-slate-50'}`}>
      {values.map(name => <ChargeChip key={name} rowId={row.id} field={field} name={name}
        onRemove={() => onChange(field === 'professor' ? '' : values.filter(value => value !== name))} />)}
      {values.length === 0 && <p className="py-2 text-center text-[11px] text-slate-400">{label} 드래그</p>}
    </div>
  );
}

export default function ChargeAssignments({ rows, onChange }) {
  const changeCell = (rowId, field, value) => onChange(rows.map(row => row.id === rowId ? { ...row, [field]: value } : row));
  return (
    <section aria-label="교수별 차지표" className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div><h3 className="text-base font-black text-slate-800">교수별 차지</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">왼쪽 명단에서 교수·전공의·PA를 드래그하세요.</p></div>
      </div>
      <div className="overflow-x-auto p-3">
        <table className="w-full table-fixed text-left text-xs">
          <thead><tr className="text-slate-500"><th className="p-2">교수</th><th className="p-2 text-blue-700">전공의</th><th className="p-2">PA</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id} className="align-top">
            <th scope="row" className="p-1 font-normal">
              <ChargeCell row={row} field="professor" onChange={value => changeCell(row.id, 'professor', value)} />
            </th>
            {['residents', 'pas'].map(field => <td key={field} className="p-1"><ChargeCell row={row} field={field} onChange={value => changeCell(row.id, field, value)} /></td>)}
          </tr>)}</tbody>
        </table>
        {rows.length === 0 && <p className="p-5 text-center text-xs text-slate-400">행 추가를 눌러 차지표를 작성하세요.</p>}
        <div className="flex justify-center gap-2 pt-3">
          <button type="button" onClick={() => onChange([...rows, { id: crypto.randomUUID(), professor: '', residents: [], pas: [] }])} className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">+ 행 추가</button>
          <button type="button" disabled={rows.length === 0} onClick={() => onChange(rows.slice(0, -1))} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40">− 마지막 행 삭제</button>
        </div>
      </div>
      <p className="border-t border-slate-100 px-5 py-4 text-[11px] leading-relaxed text-slate-500">임시저장·최종 저장 시 함께 저장됩니다. 새 날짜에는 최근 차지를 이어받습니다.</p>
    </section>
  );
}
