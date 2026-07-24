export const NZ_TIMEZONE = "Pacific/Auckland";

export function formatNZTime(date: string | Date) {
  return new Date(date)
    .toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", timeZone: NZ_TIMEZONE })
    .replace(" ", "");
}

export function formatNZDate(date: string | Date, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(date).toLocaleDateString("en-NZ", { timeZone: NZ_TIMEZONE, ...opts });
}

export function nzDayKey(date: string | Date) {
  return new Date(date).toLocaleDateString("en-CA", { timeZone: NZ_TIMEZONE });
}

export function isNZToday(date: string | Date) {
  return nzDayKey(date) === nzDayKey(new Date());
}

export function formatNZDayKey(dayKey: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString("en-NZ", { timeZone: NZ_TIMEZONE, ...opts });
}

/**
 * Converts a `datetime-local` input value (e.g. "2026-08-01T13:00"), which is
 * always NZ wall-clock time for this app's users, into the correct UTC instant.
 * Needed because Server Actions run on Vercel's UTC servers, so a naive
 * `new Date(value)` would treat the string as UTC instead of Pacific/Auckland.
 */
export function nzWallTimeToUTC(datetimeLocalValue: string): Date {
  const naiveUTC = new Date(`${datetimeLocalValue}:00Z`);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: NZ_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(naiveUTC).map((p) => [p.type, p.value]));
  const shownAsUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMs = shownAsUTC - naiveUTC.getTime();
  return new Date(naiveUTC.getTime() - offsetMs);
}
