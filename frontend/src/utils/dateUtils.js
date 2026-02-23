/**
 * dateUtils.js — centralised date/time formatting helpers.
 *
 * All dates from MongoDB arrive as UTC ISO strings (e.g. "2026-03-15T13:00:00.000Z").
 * The browser's Date constructor parses them as UTC and converts to local time for display,
 * which is correct for toLocaleString(). The only place we need extra care is when
 * pre-filling <input type="datetime-local"> inputs — those require a value in LOCAL time
 * as "YYYY-MM-DDTHH:MM", not UTC.
 */

/**
 * Format a date for display — shows local date + time.
 * e.g. "15 Mar 2026, 6:30 pm"
 */
export const fmtDateTime = (date) => {
  if (!date) return 'TBD';
  return new Date(date).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

/**
 * Format a date for display — shows local date only.
 * e.g. "15 Mar 2026"
 */
export const fmtDate = (date) => {
  if (!date) return 'TBD';
  return new Date(date).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/**
 * Convert a UTC ISO date string to the value format required by
 * <input type="datetime-local">: "YYYY-MM-DDTHH:MM" in LOCAL time.
 *
 * Without this, .toISOString().slice(0,16) gives UTC time, so the
 * input shows a time shifted by the user's UTC offset.
 */
export const toDateTimeLocalValue = (date) => {
  if (!date) return '';
  const d = new Date(date);
  // Offset the UTC time by the local timezone offset so the resulting
  // ISO string represents the local wall-clock time.
  const offsetMs = d.getTimezoneOffset() * 60 * 1000;
  const local = new Date(d.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
};

/**
 * Convert a UTC ISO date string to "YYYY-MM-DD" in LOCAL time,
 * for <input type="date"> values.
 */
export const toDateValue = (date) => {
  if (!date) return '';
  return toDateTimeLocalValue(date).slice(0, 10);
};
