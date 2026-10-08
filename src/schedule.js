import { DateTime } from 'luxon';

export const TIMEZONE = 'Asia/Bangkok';

export function parseTimeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isTimeInRange(nowMinutes, fromMinutes, toMinutes) {
  if (fromMinutes <= toMinutes) {
    return nowMinutes >= fromMinutes && nowMinutes <= toMinutes;
  }
  return nowMinutes >= fromMinutes || nowMinutes <= toMinutes;
}

export function resolveDisplayName(schedule, defaultName, now = DateTime.now().setZone(TIMEZONE)) {
  if (!now.isValid) {
    throw new Error(`Invalid DateTime for schedule resolution: ${now.invalidReason}`);
  }

  const nowMinutes = now.hour * 60 + now.minute;

  for (const entry of schedule) {
    const from = parseTimeToMinutes(entry.from);
    const to = parseTimeToMinutes(entry.to);
    if (isTimeInRange(nowMinutes, from, to)) {
      return entry.name;
    }
  }

  if (defaultName !== undefined && defaultName !== '') {
    return defaultName;
  }

  throw new Error(
    `No schedule range matches ${now.toFormat('HH:mm')} (Asia/Bangkok) and no defaultName is set`,
  );
}

export function nowBangkok() {
  return DateTime.now().setZone(TIMEZONE);
}
