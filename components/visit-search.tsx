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
import { clinicDayRange, clinicToday, formatClinicDate, formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";

const PER_PAGE = 30;

type SearchParams = Record<string, string | string[] | undefined>;

/** Keeps the current search on the link when moving between pages. */
function pageHref(
  basePath: string,
  { q, from, to }: { q: string; from: string; to: string },
  page: number,
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * The searchable, paged visit table. The owner sees every visit; a doctor
 * passes `doctorId` and sees only the visits that were theirs — RLS would
 * narrow it the same way, the filter just says so out loud.
 */
export default async function VisitSearch({
  searchParams: sp,
  basePath,
  doctorId,
}: {
  searchParams: SearchParams;
  /** The page this table lives on; search and paging links point back here. */
  basePath: string;
  doctorId?: string;
}) {
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  const pageParam = Number(typeof sp.page === "string" ? sp.page : "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * PER_PAGE;

  const supabase = await createClient();

  // count: "exact" makes Postgres report how many rows match the filters
  // before the range is applied, which is what the page numbers need.
  let query = supabase
    .from("visits")
    .select(
      `id, visit_code, status, visit_type, doctor_requested, created_at, patient_id,
       receptionist_id, nurse_id, doctor_id,
       patients(full_name, patient_code, phone)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PER_PAGE - 1);

  if (doctorId) query = query.eq("doctor_id", doctorId);
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

  // Names come from the directory view, which every desk may read; the staff
  // table itself is owner-only, so a join through it would be blank for a doctor.
  const staffIds = [
    ...new Set(
      rows.flatMap((v) => [v.receptionist_id, v.nurse_id, v.doctor_id]).filter(Boolean),
    ),
  ] as string[];
  const { data: people } = staffIds.length
    ? await supabase.from("staff_directory").select("id, full_name").in("id", staffIds)
    : { data: [] };
  const nameById = new Map((people ?? []).map((s) => [s.id, s.full_name as string]));

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const firstShown = total === 0 ? 0 : offset + 1;
  const lastShown = Math.min(offset + PER_PAGE, total);

  return (
    <section className={`${card} ${cardPad}`}>
      <SectionHead
        title={doctorId ? "My patients" : "Find a patient"}
        hint="Search by visit code, patient code, name or phone. Narrow it with a date range."
      />

      <form className="mt-5 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="DS-260925-001, DS-P-00007, Farhana, 01711…"
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
            href={basePath}
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
                : doctorId
                  ? "Patients appear here once they are assigned to you."
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
                const p = (Array.isArray(v.patients) ? (v.patients[0] ?? null) : v.patients) as {
                  full_name: string;
                  patient_code: string;
                  phone: string;
                } | null;
                const name = (id: string | null) => (id ? nameById.get(id) : undefined);
                const doc = name(v.doctor_id);

                return (
                  <tr key={v.id} className={trRow}>
                    <td className={tdCell}>
                      <Link
                        href={`${basePath}/patients/${v.patient_id}`}
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
                      <Person name={name(v.receptionist_id)} role="receptionist" />
                    </td>
                    <td className={tdCell}>
                      <Person name={name(v.nurse_id)} role="nurse" />
                    </td>
                    <td className={tdCell}>
                      <Person name={doc} role="doctor" />
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
            <Link href={pageHref(basePath, { q, from, to }, page - 1)} className={btnGhost}>
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
            <Link href={pageHref(basePath, { q, from, to }, page + 1)} className={btnGhost}>
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
  );
}
