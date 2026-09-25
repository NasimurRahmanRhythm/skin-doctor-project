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

/**
 * Age in whole years, from the date of birth when reception recorded one.
 * Falls back to the typed-in age that patients checked in before DOB was
 * asked still carry.
 */
export function patientAge(p: {
  date_of_birth?: string | null;
  age?: number | null;
}): number | null {
  if (p.date_of_birth) {
    const [y, m, d] = p.date_of_birth.split("-").map(Number);
    const [ty, tm, td] = clinicToday().split("-").map(Number);
    return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  }
  return p.age ?? null;
}

/** "1990-04-12" → "12 Apr 1990". A bare date has no timezone to shift. */
export function formatDateOfBirth(dob: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dob}T00:00:00Z`));
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
