import { format, addDays, formatISO } from 'date-fns';

export function formatDate(date) {
  return format(date, 'yyyy-MM-dd');
}

export function formatDateShort(date) {
  return format(date, 'd MMM');
}

export function toISO(date) {
  // return yyyy-MM-dd which is what our backend expects
  return formatISO(date, { representation: 'date' });
}

export function getMondayOfWeekForGivenDate(date) {
  const localMidnight = new Date(date);
  const dayOfWeek = localMidnight.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  localMidnight.setDate(localMidnight.getDate() + diff);
  return formatDate(localMidnight);
}

export function addDaysToDateStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  return formatDate(addDays(d, n));
}