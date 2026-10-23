import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRosterStatistics, buildWorkCalendar, defaultStatisticsRange, validateStatisticsRange, fetchStatisticsSchedules } from '../lib/rosterStatistics.js';
import { applyChargeDrop, readChargeRows, defaultChargeRows, CHARGE_KEY, loadLatestChargeRows } from '../lib/chargeAssignments.js';

const members = [{ name: '전공의A', role: 'Resident' }, { name: '전공의B', role: 'Resident', is_active: false }, { name: 'PA가', role: 'PA' }, { name: '기록없음', role: 'PA' }];
const schedule = (date, roster, extra = {}) => ({ work_date: date, roster_data: roster, is_temporary: false, ...extra });

test('counts half-days, combines resident clinic categories, ignores charge metadata and hides zero members', () => {
  const result = buildRosterStatistics([schedule('2026-03-02', {
    '오전-prof-slot-0': 'D', '오전-outp-0-m1': '전공의A', '오후-outp-0-m1': '전공의A',
    '오전-전공의외래-m1': '전공의B', '오전-총외래업무-m1': '전공의B', '오후-수술실(OR)-m1': '전공의B',
    '오전-검안실-m1': 'PA가', '오전-주사/처치-m1': 'PA가', '오후-주사/처치-m1': 'PA가',
    [CHARGE_KEY]: [{ professor: 'D', residents: ['전공의A'], pas: ['기록없음'] }],
  })], members);
  assert.deepEqual(result.residents.map(row => [row.name, row.counts, row.total]), [
    ['전공의A', { 교수외래: 2 }, 2], ['전공의B', { '전공의외래+총외래업무': 1, 수술실: 1 }, 2],
  ]);
  assert.deepEqual(result.pas, [{ name: 'PA가', counts: { 검안실: 1, '주사+처치': 1 }, total: 2, workdays: { actual: 1, total: 1 } }]);
  assert.deepEqual(result.unknownNames, []);
});

test('duty weekdays are KST calendar dates; missing historical resident is recovered from duty', () => {
  const rows = [schedule('2026-03-02', { 'NIGHT-DUTY': '과거전공의', '오전-수술실(OR)-m1': '과거전공의' }), schedule('2026-03-08', { 'NIGHT-DUTY': '전공의A' })];
  const result = buildRosterStatistics(rows, members);
  assert.equal(result.duties.find(row => row.name === '과거전공의').counts.월, 1);
  assert.equal(result.duties.find(row => row.name === '전공의A').counts.일, 1);
  assert.equal(result.residents.find(row => row.name === '과거전공의').counts.수술실, 1);
  assert.deepEqual(result.inferredResidents, ['과거전공의']);
});

test('closed clinics are excluded, historical PA alias is included, and unknown names are reported', () => {
  const result = buildRosterStatistics([schedule('2026-09-01', {
    '오전-outp-0-m1': '전공의A', '오전-검안실-m1': 'SA김현아', '오후-outp-1-m2': '미확인',
    'NIGHT-DUTY': '전공의A(대체)',
  }, { closed_slots: { '오전-prof-slot-0': true } })], members);
  assert.deepEqual(result.residents, []);
  assert.equal(result.pas[0].name, 'SA김현아');
  assert.equal(result.duties[0].name, '전공의A');
  assert.deepEqual(result.unknownNames, ['미확인']);
});

test('default range uses Korean today and calendar months including month-end and leap years', () => {
  assert.deepEqual(defaultStatisticsRange(new Date('2026-10-22T16:00:00Z')), { start: '2026-07-23', end: '2026-10-23' });
  assert.deepEqual(defaultStatisticsRange(new Date('2026-05-31T00:00:00Z')), { start: '2026-02-28', end: '2026-05-31' });
  assert.deepEqual(defaultStatisticsRange(new Date('2024-05-31T00:00:00Z')), { start: '2024-02-29', end: '2024-05-31' });
  assert.equal(validateStatisticsRange('2026-03-01', '2026-03-01'), '');
  assert.ok(validateStatisticsRange('2026-02-30', '2026-03-01'));
  assert.ok(validateStatisticsRange('2026-09-01', '2026-05-01'));
});

test('fetch paginates beyond server page size, applies inclusive boundaries and final-only filter', async () => {
  const calls = [];
  const client = { from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const q = { select() { return q; }, gte(...args) { call.filters.push(['gte', ...args]); return q; }, lte(...args) { call.filters.push(['lte', ...args]); return q; }, eq(...args) { call.filters.push(['eq', ...args]); return q; }, order() { return q; }, async range(start, end) { call.range = [start, end]; return { data: Array.from({ length: start === 0 ? 500 : 2 }, (_, i) => ({ id: start + i })), error: null }; } };
    return q;
  } };
  const rows = await fetchStatisticsSchedules(client, { start: '2026-03-01', end: '2026-09-01', includeTemporary: false });
  assert.equal(rows.length, 502);
  assert.deepEqual(calls.map(call => call.range), [[0, 499], [500, 999]]);
  assert.deepEqual(calls[0].filters, [['gte', 'work_date', '2026-03-01'], ['lte', 'work_date', '2026-09-01'], ['eq', 'is_temporary', false]]);
  calls.length = 0;
  await fetchStatisticsSchedules(client, { start: '2026-03-01', end: '2026-09-01', includeTemporary: true });
  assert.ok(calls.every(call => !call.filters.some(filter => filter[0] === 'eq')));
});

test('fetch failure is visible instead of returning a partial statistic', async () => {
  const q = { select() { return q; }, gte() { return q; }, lte() { return q; }, order() { return q; }, eq() { return q; }, async range() { return { error: { message: 'network failed' } }; } };
  await assert.rejects(fetchStatisticsSchedules({ from: () => q }, { start: '2026-03-01', end: '2026-03-02' }), /network failed/);
});

test('charge drops validate role, allow multiple names, preserve roster sources, move charge sources only', () => {
  const rows = [{ id: 'a', professor: 'D', residents: ['전공의A'], pas: [] }, { id: 'b', professor: 'Y', residents: [], pas: [] }];
  const target = { rowId: 'b', field: 'residents' };
  assert.strictEqual(applyChargeDrop(rows, target, { name: 'PA가', type: 'staff', role: 'PA' }), rows);
  const copied = applyChargeDrop(rows, target, { name: '전공의B', type: 'staff', role: 'Resident', sourceId: '오전-outp-0-m1' });
  assert.deepEqual(copied[0].residents, ['전공의A']);
  assert.deepEqual(copied[1].residents, ['전공의B']);
  const moved = applyChargeDrop(copied, target, { name: '전공의A', type: 'staff', role: 'Resident', chargeSource: { rowId: 'a', field: 'residents' } });
  assert.deepEqual(moved[0].residents, []);
  assert.deepEqual(moved[1].residents, ['전공의B', '전공의A']);
  assert.deepEqual(rows[0].residents, ['전공의A']);
});

test('charge snapshots preserve intentional empty tables and inherit only on/before requested date', async () => {
  assert.equal(readChargeRows({}), null);
  assert.deepEqual(readChargeRows({ [CHARGE_KEY]: [] }), []);
  assert.deepEqual(defaultChargeRows([{ id: 10, initial: 'D' }]), [{ id: 'prof-10', professor: 'D', residents: [], pas: [] }]);
  const calls = [];
  const q = { select() { return q; }, lte(...args) { calls.push(args); return q; }, not(...args) { calls.push(args); return q; }, order() { return q; }, limit() { return q; }, async maybeSingle() { return { data: { roster_data: { [CHARGE_KEY]: [] } }, error: null }; } };
  assert.deepEqual(await loadLatestChargeRows({ from: () => q }, '2026-05-01'), []);
  assert.deepEqual(calls, [['work_date', '2026-05-01'], [`roster_data->${CHARGE_KEY}`, 'is', null]]);
});

test('weekday work calendar includes resident/PA work when all professors have cancelled clinics', () => {
  const rows = [schedule('2026-03-02', { '오전-prof-slot-0': 'D', '오전-전공의외래-m1': '전공의A' }, { closed_slots: { '오전-prof-slot-0': true } }),
    schedule('2026-03-03', { '오후-검안실-m1': 'PA가' }),
    schedule('2026-03-04', { 'NIGHT-DUTY': '전공의A', 'VACATION-SLOT': ['PA가(휴가)'] }),
    schedule('2026-03-07', { '오전-수술실(OR)-m1': '전공의A', 'NIGHT-DUTY': '전공의A' })];
  const calendar = buildWorkCalendar(rows, { start: '2026-03-02', end: '2026-03-08' });
  assert.deepEqual([...calendar.workDates], ['2026-03-02', '2026-03-03']);
  assert.deepEqual([...calendar.weekdayHolidayDates], ['2026-03-04', '2026-03-05', '2026-03-06']);
  assert.ok(!calendar.weekdayHolidayDates.has('2026-03-07'));
});

test('weekday public-holiday duty is a subset of Monday-Friday duty, never includes weekend or increases total', () => {
  const rows = [schedule('2026-03-02', { '오전-전공의외래-m1': '전공의A', 'NIGHT-DUTY': '전공의A' }),
    schedule('2026-03-03', { 'NIGHT-DUTY': '전공의A' }), schedule('2026-03-07', { 'NIGHT-DUTY': '전공의A' }), schedule('2026-03-08', { 'NIGHT-DUTY': '전공의A' })];
  const result = buildRosterStatistics(rows, members, { start: '2026-03-02', end: '2026-03-08' });
  const duty = result.duties[0];
  assert.equal(duty.total, 4);
  assert.equal(duty.weekdayHoliday, 1);
  assert.deepEqual(duty.counts, { 월: 1, 화: 1, 토: 1, 일: 1 });
});

test('actual workdays follow placed half-days, ignore off notes and exclude weekend day shifts', () => {
  const rows = [schedule('2026-03-02', { '오전-검안실-m1': 'PA가', '오후-주사/처치-m1': 'PA가', 'VACATION-SLOT': ['PA가(휴가)'], '오전-전공의외래-m1': '전공의A' }),
    schedule('2026-03-03', { '오전-검안실-m1': 'PA가', '오후-검안실-m1': 'PA가', 'VACATION-SLOT': ['PA가(오전반차)', 'PA가(오전반차)', '전공의A(당직오프)'], '오후-전공의외래-m1': '전공의A' }),
    schedule('2026-03-04', { '오전-수술실(OR)-m1': '전공의B' }),
    schedule('2026-03-05', { '오전-전공의외래-m1': '전공의A' }),
    schedule('2026-03-07', { '오전-검안실-m1': 'PA가' })];
  const result = buildRosterStatistics(rows, members, { start: '2026-03-02', end: '2026-03-08' });
  assert.equal(result.workingDays, 4);
  assert.deepEqual(result.pas[0].workdays, { actual: 2, total: 4 });
  assert.deepEqual(result.residents.find(row => row.name === '전공의A').workdays, { actual: 1.5, total: 4 });
  assert.deepEqual(result.residents.find(row => row.name === '전공의B').workdays, { actual: 0.5, total: 4 });
  assert.deepEqual(result.excludedWeekendPlacementDates, ['2026-03-07']);
});

test('even full off notes do not erase actual placements; closed clinic leftovers remain excluded', () => {
  const rows = [schedule('2026-03-02', { '오전-outp-0-m1': 'PA가', '오전-prof-slot-0': 'D' }, { closed_slots: { '오전-prof-slot-0': true } }),
    schedule('2026-03-03', { '오전-검안실-m1': 'PA가', 'VACATION-SLOT': ['PA가(오전반차)', 'PA가(오후반차)'] })];
  const result = buildRosterStatistics(rows, members, { start: '2026-03-02', end: '2026-03-03' });
  assert.equal(result.workingDays, 1);
  assert.equal(result.weekdayHolidays, 1);
  assert.deepEqual(result.pas[0].workdays, { actual: 0.5, total: 1 });
});

test('PA OR placements are shown as other work so visible counts reconcile to half-day workdays', () => {
  const result = buildRosterStatistics([schedule('2026-03-02', { '오전-수술실(OR)-m1': 'SA김현아', '오후-수술실(OR)-m2': 'SA김현아' })], members);
  assert.equal(result.pas.length, 1);
  assert.equal(result.pas[0].name, 'SA김현아');
  assert.equal(result.pas[0].total, 2);
  assert.deepEqual(result.pas[0].counts, { '기타 업무': 2 });
  assert.deepEqual(result.pas[0].workdays, { actual: 1, total: 1 });
});

test('OR wins every overlap, clinic wins remaining overlaps, and ordering never changes the choice', () => {
  const roster = {
    '오전-총외래업무-m1': '전공의A', '오전-outp-0-m1': '전공의A', '오전-수술실(OR)-m1': '전공의A',
    '오후-전공의외래-m1': '전공의A', '오후-outp-1-m1': '전공의A',
    '오전-주사/처치-m1': 'PA가', '오전-수술실(OR)-m2': 'PA가',
    '오후-검안실-m1': 'PA가', '오후-outp-0-m2': 'PA가', '오후-outp-1-m2': 'PA가',
  };
  for (const value of [roster, Object.fromEntries(Object.entries(roster).reverse())]) {
    const result = buildRosterStatistics([schedule('2026-03-02', value)], members);
    assert.deepEqual(result.residents[0].counts, { 수술실: 1, 교수외래: 1 });
    assert.deepEqual(result.pas[0].counts, { '기타 업무': 1, 교수외래: 1 });
    assert.equal(result.collapsedHalfDays, 4);
    for (const row of [...result.residents, ...result.pas]) {
      assert.equal(row.total, 2);
      assert.equal(row.workdays.actual, 1);
      assert.equal(Object.values(row.counts).reduce((a, b) => a + b, 0), row.total);
    }
  }
});

test('one weekday morning is half a day while Saturday day work is excluded and Saturday duty is retained', () => {
  const result = buildRosterStatistics([
    schedule('2026-03-02', { '오전-수술실(OR)-m1': '전공의A', 'VACATION-SLOT': ['전공의A(당직오프)'] }),
    schedule('2026-03-07', { '오전-수술실(OR)-m1': '전공의A', '오후-outp-0-m1': '전공의A', 'NIGHT-DUTY': '전공의A' }),
  ], members);
  assert.equal(result.residents[0].total, 1);
  assert.equal(result.residents[0].workdays.actual, 0.5);
  assert.equal(result.duties[0].counts.토, 1);
  assert.equal(result.duties[0].weekdayHoliday || 0, 0);
});
