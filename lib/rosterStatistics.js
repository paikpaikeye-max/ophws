export const RESIDENT_CATEGORIES = ['교수외래', '전공의외래+총외래업무', '수술실'];
export const PA_CATEGORIES = ['교수외래', '검안실', '주사+처치'];
export const DUTY_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
export const OTHER_CATEGORY = '기타 업무';

// Confirmed historical alias. Deleted/inactive names are never guessed from their spelling.
const HISTORICAL_ROLES = { 'SA김현아': 'PA' };

export function todayInKorea(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function defaultStatisticsRange(now = new Date()) {
  const end = todayInKorea(now);
  const [year, month, day] = end.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, month - 4, 1));
  const lastDay = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  monthStart.setUTCDate(Math.min(day, lastDay));
  return { start: monthStart.toISOString().slice(0, 10), end };
}

export function validateStatisticsRange(start, end) {
  const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end)) return '시작일과 종료일을 올바르게 입력해주세요.';
  if (start > end) return '시작일은 종료일보다 늦을 수 없습니다.';
  return '';
}

export async function fetchStatisticsSchedules(client, { start, end, includeTemporary }) {
  const invalid = validateStatisticsRange(start, end);
  if (invalid) throw new Error(invalid);
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = client.from('daily_schedules').select('work_date,roster_data,closed_slots,is_temporary')
      .gte('work_date', start).lte('work_date', end).order('work_date', { ascending: true });
    if (!includeTemporary) query = query.eq('is_temporary', false);
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function plainName(value) {
  return typeof value === 'string' ? value.split('(')[0].trim() : '';
}

function dayCategory(key, role) {
  if (/^(오전|오후)-outp-\d+-m\d+$/.test(key)) return '교수외래';
  if (role === 'Resident') {
    if (/^(오전|오후)-(전공의외래|총외래업무)-m\d+$/.test(key)) return RESIDENT_CATEGORIES[1];
    if (/^(오전|오후)-수술실\(OR\)-m\d+$/.test(key)) return '수술실';
  }
  if (role === 'PA') {
    if (/^(오전|오후)-검안실-m\d+$/.test(key)) return '검안실';
    if (/^(오전|오후)-주사\/처치-m\d+$/.test(key)) return '주사+처치';
  }
  return null;
}

function isDaySlot(key) {
  return /^(오전|오후)-(?:prof-slot-\d+|outp-\d+-m\d+|(?:전공의외래|총외래업무|검안실|주사\/처치|수술실\(OR\))-m\d+)$/.test(key);
}

function isOpenDaySlot(schedule, key) {
  if (!isDaySlot(key)) return false;
  const clinic = key.match(/^(오전|오후)-(?:prof-slot-(\d+)|outp-(\d+)-m\d+)$/);
  return !clinic || !schedule.closed_slots?.[`${clinic[1]}-prof-slot-${clinic[2] ?? clinic[3]}`];
}

function isWeekday(date) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

export function buildWorkCalendar(schedules, range = {}) {
  const dated = schedules.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.work_date));
  const dates = dated.map(row => row.work_date).sort();
  const start = range.start || dates[0];
  const end = range.end || dates.at(-1);
  const workDates = new Set();
  for (const schedule of dated) {
    if (!isWeekday(schedule.work_date)) continue;
    const hasDayWork = Object.entries(schedule.roster_data || {}).some(([key, value]) =>
      isOpenDaySlot(schedule, key) && (Array.isArray(value) ? value : [value]).some(item => plainName(item)));
    if (hasDayWork) workDates.add(schedule.work_date);
  }
  const weekdayHolidayDates = new Set();
  if (start && end && !validateStatisticsRange(start, end)) {
    const endTime = new Date(`${end}T00:00:00Z`).getTime();
    for (let date = new Date(`${start}T00:00:00Z`); date.getTime() <= endTime; date.setUTCDate(date.getUTCDate() + 1)) {
      const key = date.toISOString().slice(0, 10);
      if (isWeekday(key) && !workDates.has(key)) weekdayHolidayDates.add(key);
    }
  }
  return { workDates, weekdayHolidayDates };
}

/* [DEPRECATED: 2026-10-23] 날짜 단위 근무일 및 오프 차감 방식.
   배치된 반나절을 0.5일로 집계하는 아래 방식으로 대체합니다.
function absenceDays(entries, name) {
  let morning = false;
  let afternoon = false;
  let genericHalf = false;
  for (const value of entries) {
    if (plainName(value) !== name) continue;
    const note = value.slice(value.indexOf('(') >= 0 ? value.indexOf('(') : value.length);
    if (note.includes('오전')) morning = true;
    else if (note.includes('오후')) afternoon = true;
    else if (note.includes('반차')) genericHalf = true;
    else return 1;
  }
  return Math.min(1, (Number(morning) + Number(afternoon) + Number(genericHalf)) * 0.5);
}

function workAttendance(schedules, roles, workDates) {
  const attendance = new Map();
  const seen = new Set();
  for (const schedule of schedules) {
    if (!workDates.has(schedule.work_date) || seen.has(schedule.work_date)) continue;
    seen.add(schedule.work_date);
    const roster = schedule.roster_data || {};
    const placed = new Set();
    for (const [key, value] of Object.entries(roster)) {
      if (key.includes('-prof-slot-') || !isOpenDaySlot(schedule, key)) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        const name = plainName(item);
        if (roles.has(name)) placed.add(name);
      }
    }
    const off = Array.isArray(roster['VACATION-SLOT']) ? roster['VACATION-SLOT'] : typeof roster['VACATION-SLOT'] === 'string' ? [roster['VACATION-SLOT']] : [];
    const names = new Set([...placed, ...off.map(plainName).filter(name => roles.has(name))]);
    for (const name of names) {
      if (!attendance.has(name)) attendance.set(name, { actual: 0, off: 0 });
      const row = attendance.get(name);
      const absence = absenceDays(off, name);
      row.off += absence;
      if (placed.has(name)) row.actual += 1 - absence;
    }
  }
  return attendance;
}
*/

function halfDayChoice(key, role) {
  const operatingRoom = key.includes('-수술실(OR)-');
  const category = dayCategory(key, role) || OTHER_CATEGORY;
  const remaining = ['전공의외래+총외래업무', '검안실', '주사+처치', OTHER_CATEGORY];
  return { category, priority: operatingRoom ? 0 : category === '교수외래' ? 1 : 2 + remaining.indexOf(category) };
}

export function buildRosterStatistics(schedules, members, range = {}) {
  const roles = new Map(Object.entries(HISTORICAL_ROLES));
  const order = new Map();
  members.forEach((member, index) => {
    if (member.name && ['Resident', 'PA'].includes(member.role)) {
      roles.set(member.name, member.role);
      order.set(member.name, index);
    }
  });
  // NIGHT-DUTY is explicitly the resident duty slot, so it can identify a removed resident.
  const inferredResidents = new Set();
  schedules.forEach(schedule => {
    const name = plainName(schedule.roster_data?.['NIGHT-DUTY']);
    if (name && !roles.has(name)) { roles.set(name, 'Resident'); inferredResidents.add(name); }
  });
  const calendar = buildWorkCalendar(schedules, range);
  const residentMap = new Map();
  const paMap = new Map();
  const dutyMap = new Map();
  const unknown = new Set();
  const seen = new Set();
  const halfDays = new Map();
  const weekendPlacementDates = new Set();
  function increment(map, name, category) {
    if (!map.has(name)) map.set(name, { name, counts: {}, total: 0 });
    const row = map.get(name);
    row.counts[category] = (row.counts[category] || 0) + 1;
    row.total += 1;
  }
  for (const schedule of schedules) {
    const roster = schedule.roster_data || {};
    for (const [key, value] of Object.entries(roster)) {
      if (!/^(오전|오후)-/.test(key) && key !== 'NIGHT-DUTY') continue;
      if (key.includes('-prof-slot-')) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        const name = plainName(item);
        if (!name) continue;
        const role = roles.get(name);
        if (!role) { unknown.add(name); continue; }
        if (key === 'NIGHT-DUTY') {
          if (role !== 'Resident') continue;
          const id = `${schedule.work_date}:당직:${name}`;
          if (seen.has(id)) continue;
          seen.add(id);
          const weekday = new Date(`${schedule.work_date}T00:00:00Z`).getUTCDay();
          increment(dutyMap, name, DUTY_WEEKDAYS[(weekday + 6) % 7]);
          if (calendar.weekdayHolidayDates.has(schedule.work_date)) {
            const duty = dutyMap.get(name);
            duty.weekdayHoliday = (duty.weekdayHoliday || 0) + 1;
          }
          continue;
        }
        if (!isOpenDaySlot(schedule, key)) continue;
        if (!isWeekday(schedule.work_date)) { weekendPlacementDates.add(schedule.work_date); continue; }
        const id = `${schedule.work_date}:${key.split('-')[0]}:${name}`;
        if (!halfDays.has(id)) halfDays.set(id, { name, role, choices: new Map() });
        halfDays.get(id).choices.set(key, halfDayChoice(key, role));
      }
    }
  }
  let collapsedHalfDays = 0;
  for (const half of halfDays.values()) {
    const choices = [...half.choices.values()].sort((a, b) => a.priority - b.priority || a.category.localeCompare(b.category, 'ko'));
    if (choices.length > 1) collapsedHalfDays += 1;
    increment(half.role === 'Resident' ? residentMap : paMap, half.name, choices[0].category);
  }
  const sorted = map => [...map.values()].sort((a, b) => (order.get(a.name) ?? Infinity) - (order.get(b.name) ?? Infinity) || a.name.localeCompare(b.name, 'ko'));
  const withWorkdays = map => sorted(map).map(row => ({ ...row, workdays: { actual: row.total / 2, total: calendar.workDates.size } }));
  return {
    residents: withWorkdays(residentMap), pas: withWorkdays(paMap), duties: sorted(dutyMap),
    workingDays: calendar.workDates.size, weekdayHolidays: calendar.weekdayHolidayDates.size,
    collapsedHalfDays, excludedWeekendPlacementDates: [...weekendPlacementDates].sort(),
    unknownNames: [...unknown].sort(), inferredResidents: [...inferredResidents].sort(),
    scheduleCount: schedules.length,
    temporaryCount: schedules.filter(schedule => schedule.is_temporary).length,
    firstDate: schedules.length ? schedules.reduce((first, row) => row.work_date < first ? row.work_date : first, schedules[0].work_date) : null,
    lastDate: schedules.length ? schedules.reduce((last, row) => row.work_date > last ? row.work_date : last, schedules[0].work_date) : null,
  };
}
