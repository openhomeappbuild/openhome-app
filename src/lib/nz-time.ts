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
