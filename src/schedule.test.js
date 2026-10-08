import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import {
  resolveDisplayName,
  isTimeInRange,
  parseTimeToMinutes,
  TIMEZONE,
} from './schedule.js';

function at(hour, minute) {
  return DateTime.fromObject(
    { year: 2026, month: 10, day: 9, hour, minute },
    { zone: TIMEZONE },
  );
}

const shopSchedule = [
  { from: '01:00', to: '09:59', name: 'Closed' },
  { from: '10:00', to: '00:59', name: 'Open' },
];

describe('isTimeInRange', () => {
  it('handles same-day inclusive range', () => {
    const from = parseTimeToMinutes('08:00');
    const to = parseTimeToMinutes('17:59');
    assert.equal(isTimeInRange(parseTimeToMinutes('08:00'), from, to), true);
    assert.equal(isTimeInRange(parseTimeToMinutes('07:59'), from, to), false);
    assert.equal(isTimeInRange(parseTimeToMinutes('17:59'), from, to), true);
  });

  it('handles midnight wrap', () => {
    const from = parseTimeToMinutes('22:00');
    const to = parseTimeToMinutes('02:00');
    assert.equal(isTimeInRange(parseTimeToMinutes('23:00'), from, to), true);
    assert.equal(isTimeInRange(parseTimeToMinutes('01:00'), from, to), true);
    assert.equal(isTimeInRange(parseTimeToMinutes('12:00'), from, to), false);
  });
});

describe('resolveDisplayName', () => {
  it('uses name for any minute inside closed range', () => {
    assert.equal(resolveDisplayName(shopSchedule, undefined, at(1, 0)), 'Closed');
    assert.equal(resolveDisplayName(shopSchedule, undefined, at(5, 30)), 'Closed');
    assert.equal(resolveDisplayName(shopSchedule, undefined, at(9, 59)), 'Closed');
  });

  it('uses open name outside closed hours including 00:xx', () => {
    assert.equal(resolveDisplayName(shopSchedule, undefined, at(0, 0)), 'Open');
    assert.equal(resolveDisplayName(shopSchedule, undefined, at(0, 59)), 'Open');
    assert.equal(resolveDisplayName(shopSchedule, undefined, at(10, 0)), 'Open');
    assert.equal(resolveDisplayName(shopSchedule, undefined, at(23, 59)), 'Open');
  });

  it('uses defaultName when no range matches', () => {
    const partial = [{ from: '12:00', to: '13:00', name: 'Lunch' }];
    assert.equal(resolveDisplayName(partial, 'Fallback', at(9, 0)), 'Fallback');
  });

  it('picks first matching range in config order', () => {
    const ordered = [
      { from: '09:00', to: '11:00', name: 'A' },
      { from: '10:00', to: '12:00', name: 'B' },
    ];
    assert.equal(resolveDisplayName(ordered, 'X', at(10, 30)), 'A');
  });
});
