import Link from "next/link";
import {
  btnGhost,
  btnPrimary,
  card,
  cardPad,
  Code,
  EmptyState,
  field,
  Person,
  SectionHead,
  StatusPill,
  tableEl,
  tableWrap,
  tdCell,
  thCell,
  trRow,
} from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { clinicDayRange, clinicToday, formatClinicDate, formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";

/**
 * A tile on the dark band. The dot carries the same colour the status pill
 * uses further down the page, so "with nurse" is one idea in two places.
 */
function Stat({
  label,
  value,
  dot,
}: {
  label: string;
  value: string | number;
  dot: string;
}) {
  return (
    <div className="rounded-control border border-white/15 bg-white/10 px-4 py-3.5 transition-ui hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.16]">
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-hero-fg/75">
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </span>
      <span className="mt-2 block text-3xl font-extrabold tabular leading-none">
        {value}
      </span>
    </div>
  );
}

const PER_PAGE = 30;

/** Keeps the current search on the link when moving between pages. */
function pageHref(
  { q, from, to }: { q: string; from: string; to: string },
  page: number,
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/super-admin/owner?${qs}` : "/super-admin/owner";
}

export default async function OwnerPage({
  searchParams,
}: PageProps<"/super-admin/owner">) {
  await requireRole("owner");
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  const pageParam = Number(typeof sp.page === "string" ? sp.page : "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * PER_PAGE;

  const supabase = await createClient();
  const today = clinicDayRange();

  // ---- today's snapshot -------------------------------------------------
  const { data: todayVisits } = await supabase
    .from("visits")
    .select("status")
    .gte("created_at", today.start)
    .lt("created_at", today.end);

  const counts = { awaiting_vitals: 0, awaiting_doctor: 0, completed: 0 };
  for (const v of todayVisits ?? []) {
    counts[v.status as keyof typeof counts]++;
  }

  // ---- search ------------------------------------------------------------
  // count: "exact" makes Postgres report how many rows match the filters
  // before the range is applied, which is what the page numbers need.
  let query = supabase
    .from("visits")
    .select(
      `id, visit_code, status, visit_type, doctor_requested, created_at, patient_id,
       patients(full_name, patient_code, phone),
       receptionist:receptionist_id(full_name),
       nurse:nurse_id(full_name),
       doctor:doctor_id(full_name)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PER_PAGE - 1);

  if (from) query = query.gte("created_at", clinicDayRange(from).start);
  if (to) query = query.lt("created_at", clinicDayRange(to).end);

  if (q) {
    // Name, patient code and phone live on patients, so resolve those to ids
    // first and then match either the visit code or one of those patients.
    const { data: matched } = await supabase
      .from("patients")
      .select("id")
      .or(`full_name.ilike.%${q}%,patient_code.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(200);

    const ids = (matched ?? []).map((p) => p.id);
    query = ids.length
      ? query.or(`visit_code.ilike.%${q}%,patient_id.in.(${ids.join(",")})`)
      : query.ilike("visit_code", `%${q}%`);
  }

  const { data: results, count } = await query;
  const rows = results ?? [];
  const searching = Boolean(q || from || to);

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const firstShown = total === 0 ? 0 : offset + 1;
  const lastShown = Math.min(offset + PER_PAGE, total);

  return (
    <div className="space-y-6">
      <section className="hero animate-rise relative overflow-hidden rounded-card px-6 py-7 shadow-lift sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-hero-fg/60">
              Owner dashboard
            </p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-[28px]">
              Today at the clinic
            </h1>
            <p className="mt-1 text-sm text-hero-fg/75">
              {formatClinicDate(today.start)}
            </p>
          </div>

          <Link
            href="/super-admin/owner/staff"
            className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
          >
            Manage staff
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Checked in"
            value={(todayVisits ?? []).length}
            dot="bg-white/70"
          />
          <Stat label="With nurse" value={counts.awaiting_vitals} dot="bg-amber-300" />
          <Stat label="With doctor" value={counts.awaiting_doctor} dot="bg-teal-300" />
          <Stat label="Completed" value={counts.completed} dot="bg-emerald-300" />
        </div>
      </section>

      <section className={`${card} ${cardPad}`}>
        <SectionHead
          title="Find a patient"
          hint="Search by visit code, patient code, name or phone. Narrow it with a date range."
        />

        <form className="mt-5 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            name="q"
            defaultValue={q}
            placeholder="LL-260924-001, LL-P-00007, Farhana, 01711…"
            className={field}
          />
          <input
            type="date"
            name="from"
            defaultValue={from}
            max={clinicToday()}
            className={field}
            aria-label="From date"
          />
          <input
            type="date"
            name="to"
            defaultValue={to}
            max={clinicToday()}
            className={field}
            aria-label="To date"
          />
          <button type="submit" className={btnPrimary}>
            Search
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-muted">
            {total === 0
              ? "No visits"
              : `Showing ${firstShown}–${lastShown} of ${total} ${
                  searching ? "matching " : ""
                }${total === 1 ? "visit" : "visits"}`}
          </p>
          {searching && (
            <Link
              href="/super-admin/owner"
              className="text-xs font-bold text-primary underline-offset-4 hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={searching ? "Nothing matches that" : "No visits yet"}
              hint={
                searching
                  ? "Try part of a name, or clear the date range."
                  : "Visits appear here as reception checks patients in."
              }
            />
          </div>
        ) : (
          <div className={`mt-4 ${tableWrap}`}>
            <table className={tableEl}>
              <thead>
                <tr>
                  <th className={`${thCell} rounded-tl-card`}>Patient</th>
                  <th className={thCell}>Visit</th>
                  <th className={thCell}>Reception</th>
                  <th className={thCell}>Nurse</th>
                  <th className={thCell}>Doctor</th>
                  <th className={`${thCell} rounded-tr-card`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => {
                  const one = <T,>(x: T | T[] | null) =>
                    Array.isArray(x) ? (x[0] ?? null) : x;
                  const p = one(v.patients) as {
                    full_name: string;
                    patient_code: string;
                    phone: string;
                  } | null;
                  const rec = one(v.receptionist) as { full_name: string } | null;
                  const nur = one(v.nurse) as { full_name: string } | null;
                  const doc = one(v.doctor) as { full_name: string } | null;

                  return (
                    <tr key={v.id} className={trRow}>
                      <td className={tdCell}>
                        <Link
                          href={`/super-admin/owner/patients/${v.patient_id}`}
                          className="font-bold text-fg underline-offset-4 transition-ui hover:text-primary hover:underline"
                        >
                          {p?.full_name ?? "—"}
                        </Link>
                        <span className="mt-0.5 block text-xs text-muted">
                          <Code>{p?.patient_code}</Code> · {p?.phone}
                        </span>
                      </td>
                      <td className={tdCell}>
                        <Code className="font-semibold">{v.visit_code}</Code>
                        <span className="mt-0.5 block text-xs text-muted">
                          {formatClinicDate(v.created_at)}{" "}
                          {formatClinicTime(v.created_at)} · {v.visit_type}
                        </span>
                      </td>
                      <td className={tdCell}>
                        <Person name={rec?.full_name} role="receptionist" />
                      </td>
                      <td className={tdCell}>
                        <Person name={nur?.full_name} role="nurse" />
                      </td>
                      <td className={tdCell}>
                        <Person name={doc?.full_name} role="doctor" />
                        {doc && (
                          <span className="mt-0.5 block pl-8 text-[11px] font-semibold text-muted">
                            {v.doctor_requested ? "requested" : "auto-assigned"}
                          </span>
                        )}
                      </td>
                      <td className={tdCell}>
                        <StatusPill status={v.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {lastPage > 1 && (
          <nav
            aria-label="Pagination"
            className="mt-5 flex items-center justify-between gap-3"
          >
            {page > 1 ? (
              <Link href={pageHref({ q, from, to }, page - 1)} className={btnGhost}>
                ← Previous
              </Link>
            ) : (
              <span className={`${btnGhost} pointer-events-none opacity-40`}>
                ← Previous
              </span>
            )}

            <span className="text-xs font-bold tabular text-muted">
              Page {page} of {lastPage}
            </span>

            {page < lastPage ? (
              <Link href={pageHref({ q, from, to }, page + 1)} className={btnGhost}>
                Next →
              </Link>
            ) : (
              <span className={`${btnGhost} pointer-events-none opacity-40`}>
                Next →
              </span>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
