export const CHARGE_KEY = '__charge_assignments';

export function readChargeRows(roster) {
  if (!Array.isArray(roster?.[CHARGE_KEY])) return null;
  return roster[CHARGE_KEY].map((row, index) => ({
    id: String(row.id || `saved-${index}`),
    professor: typeof row.professor === 'string' ? row.professor : '',
    residents: Array.isArray(row.residents) ? row.residents.filter(name => typeof name === 'string') : [],
    pas: Array.isArray(row.pas) ? row.pas.filter(name => typeof name === 'string') : [],
  }));
}

export function defaultChargeRows(professors) {
  return professors.map(professor => ({
    id: `prof-${professor.id}`, professor: professor.initial, residents: [], pas: [],
  }));
}

// A charge is an independent assignment: copying a roster chip here never removes its daily placement.
export function applyChargeDrop(rows, target, item) {
  const expected = target.field === 'professor' ? 'prof' : 'staff';
  if (item.type !== expected) return rows;
  if (target.field === 'residents' && item.role !== 'Resident') return rows;
  if (target.field === 'pas' && item.role !== 'PA') return rows;
  if (!rows.some(row => row.id === target.rowId)) return rows;
  if (item.chargeSource?.rowId === target.rowId && item.chargeSource.field === target.field) return rows;
  return rows.map(row => {
    const next = { ...row, residents: [...row.residents], pas: [...row.pas] };
    if (item.chargeSource?.rowId === row.id) {
      const field = item.chargeSource.field;
      if (field === 'professor') next.professor = '';
      else if (field === 'residents' || field === 'pas') next[field] = next[field].filter(name => name !== item.name);
    }
    if (row.id === target.rowId) {
      if (target.field === 'professor') next.professor = item.name;
      else if (!next[target.field].includes(item.name)) next[target.field].push(item.name);
    }
    return next;
  });
}

export async function loadLatestChargeRows(client, date) {
  const { data, error } = await client.from('daily_schedules')
    .select('roster_data')
    .lte('work_date', date)
    .not(`roster_data->${CHARGE_KEY}`, 'is', null)
    .order('work_date', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return readChargeRows(data?.roster_data);
}
