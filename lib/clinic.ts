/**
 * Clinic-local calendar helpers.
 *
 * Mirrors the SQL side (public.clinic_today()). "Today" has to mean Asia/Dhaka
 * everywhere, or the front desk loses the morning's check-ins at 6am local when
 * UTC rolls over.
 */
export const CLINIC_TZ = "Asia/Dhaka";

/** Bangladesh has observed no DST since 2009, so the offset is fixed. */
const CLINIC_UTC_OFFSET = "+06:00";

/** Today in the clinic's timezone, as YYYY-MM-DD. */
export function clinicToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is what we want to hand to Postgres.
  return new Intl.DateTimeFormat("en-CA", { timeZone: CLINIC_TZ }).format(now);
}

/**
 * Half-open [start, end) range covering a clinic day, as timestamps Postgres
 * can compare against `created_at`.
 */
export function clinicDayRange(day: string = clinicToday()): {
  start: string;
  end: string;
} {
  const start = new Date(`${day}T00:00:00${CLINIC_UTC_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function formatClinicTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatClinicDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
