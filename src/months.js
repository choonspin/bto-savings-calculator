// Months are stored as 'YYYY-MM' keys so saved and shared plans stay readable.

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value) {
  return typeof value === 'string' && MONTH_KEY.test(value);
}

export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(key, count) {
  const [year, month] = key.split('-').map(Number);
  return monthKey(new Date(year, month - 1 + count, 1));
}

/** Whole months from `from` to `to`; negative when `to` is earlier. */
export function monthsBetween(from, to) {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

/** 'Nov 2026' */
export function formatMonth(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
}
