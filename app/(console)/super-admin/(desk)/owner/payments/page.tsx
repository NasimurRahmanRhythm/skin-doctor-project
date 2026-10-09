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
  tableEl,
  tableWrap,
  tdCell,
  thCell,
  trRow,
} from "@/components/ui";
import { formatPaisa } from "@/lib/amount-in-words";
import { requireRole } from "@/lib/auth";
import {
  clinicToday,
  formatClinicDate,
  formatClinicTime,
  formatDateOfBirth,
} from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";

const PER_PAGE = 30;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Item = {
  description: string;
  cost: number | null;
  qty: number | null;
  total: number | null;
};

const taka = (amount: number) => `৳ ${formatPaisa(Math.round(amount * 100))}`;

/**
 * Every payment slip reception has saved, and who took each one.
 *
 * The cards at the top answer "how much did each desk handle" for the chosen
 * dates; the table underneath is the slips themselves, newest first.
 */
export default async function PaymentsPage({
  searchParams,
}: PageProps<"/super-admin/owner/payments">) {
  await requireRole("owner");
  const sp = await searchParams;

  const param = (key: string, shape: RegExp) => {
    const v = sp[key];
    return typeof v === "string" && shape.test(v) ? v : "";
  };
  const from = param("from", DATE);
  const to = param("to", DATE);
  const by = param("by", UUID);
  const pageParam = Number(typeof sp.page === "string" ? sp.page : "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * PER_PAGE;

  const href = (next: { by?: string; page?: number }) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const who = next.by ?? by;
    if (who) params.set("by", who);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const qs = params.toString();
    return qs ? `/super-admin/owner/payments?${qs}` : "/super-admin/owner/payments";
  };

  const supabase = await createClient();

  let query = supabase
    .from("payment_slips")
    // Every column, so the list still loads before patient_code exists
    // (migration 20261009000024).
    .select("*", { count: "exact" })
    .order("slip_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + PER_PAGE - 1);

  if (from) query = query.gte("slip_date", from);
  if (to) query = query.lte("slip_date", to);
  if (by) query = query.eq("receptionist_id", by);

  const [{ data: slips, count, error }, { data: totals }, { data: people }] =
    await Promise.all([
      query,
      supabase.rpc("payment_slip_totals", {
        p_from: from || null,
        p_to: to || null,
      }),
      supabase.from("staff_directory").select("id, full_name, role"),
    ]);

  const nameById = new Map((people ?? []).map((s) => [s.id, s.full_name as string]));

  const desks = ((totals ?? []) as { receptionist_id: string; slips: number; total: number }[])
    .map((t) => ({
      id: t.receptionist_id,
      name: nameById.get(t.receptionist_id) ?? "Unknown",
      slips: Number(t.slips),
      total: Number(t.total),
    }))
    .sort((a, b) => b.total - a.total);

  const shownDesks = by ? desks.filter((d) => d.id === by) : desks;
  const collected = shownDesks.reduce((sum, d) => sum + d.total, 0);
  const slipCount = shownDesks.reduce((sum, d) => sum + d.slips, 0);

  // Anyone who has ever saved a slip stays pickable after they leave the desk.
  const receptionists = (people ?? []).filter(
    (s) => s.role === "receptionist" || desks.some((d) => d.id === s.id),
  );

  const rows = slips ?? [];
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtering = Boolean(from || to || by);

  const range =
    from && to
      ? `${formatDateOfBirth(from)} – ${formatDateOfBirth(to)}`
      : from
        ? `Since ${formatDateOfBirth(from)}`
        : to
          ? `Up to ${formatDateOfBirth(to)}`
          : "All dates";

  return (
    <div className="space-y-6">
      <section className="hero animate-rise relative overflow-hidden rounded-card px-6 py-7 shadow-lift sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-hero-fg/60">
              Payments
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tabular sm:text-[28px]">
              {taka(collected)}
            </h1>
            <p className="mt-1 text-sm text-hero-fg/75">
              {slipCount} {slipCount === 1 ? "slip" : "slips"} · {range}
              {by && ` · ${nameById.get(by) ?? "one receptionist"}`}
            </p>
          </div>
          <Link
            href="/super-admin/owner"
            className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
          >
            <span aria-hidden="true">←</span>
            Back to dashboard
          </Link>
        </div>
      </section>

      {error ? (
        <p className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          <strong>The database is not ready for this yet.</strong> Run the payment slips
          migration (supabase/migrations/20261006000020) in Supabase, then reload.
        </p>
      ) : (
        <>
          <section className={`${card} ${cardPad}`}>
            <SectionHead
              title="Handled by"
              hint="What each receptionist took in over these dates. Pick one to see only their slips."
            />
            {desks.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No payments in this range.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {desks.map((d) => {
                  const active = by === d.id;
                  return (
                    <li key={d.id}>
                      <Link
                        href={href({ by: active ? "" : d.id })}
                        aria-current={active ? "true" : undefined}
                        className={`block rounded-control border px-4 py-3 transition-ui hover:border-primary/55 hover:bg-primary-soft/40 ${
                          active ? "border-primary bg-primary-soft" : "border-hairline bg-surface"
                        }`}
                      >
                        <Person name={d.name} role="receptionist" className="text-sm" />
                        <span className="mt-2 block text-xl font-extrabold tabular">
                          {taka(d.total)}
                        </span>
                        <span className="text-xs font-semibold text-muted">
                          {d.slips} {d.slips === 1 ? "slip" : "slips"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={`${card} ${cardPad}`}>
            <SectionHead
              title="Payment slips"
              hint="Newest first, by the date written on the slip."
            />

            <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
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
                className={field}
                aria-label="To date"
              />
              <select name="by" defaultValue={by} className={field} aria-label="Receptionist">
                <option value="">All receptionists</option>
                {receptionists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
              <button type="submit" className={btnPrimary}>
                Filter
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted">
                {total === 0
                  ? "No slips"
                  : `Showing ${offset + 1}–${Math.min(offset + PER_PAGE, total)} of ${total} ${
                      total === 1 ? "slip" : "slips"
                    }`}
              </p>
              {filtering && (
                <Link
                  href="/super-admin/owner/payments"
                  className="text-xs font-bold text-primary underline-offset-4 hover:underline"
                >
                  Clear filters
                </Link>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title={filtering ? "Nothing matches that" : "No payment slips yet"}
                  hint={
                    filtering
                      ? "Try a wider date range or another receptionist."
                      : "Slips appear here as reception saves and prints them."
                  }
                />
              </div>
            ) : (
              <div className={`mt-4 ${tableWrap}`}>
                <table className={tableEl}>
                  <thead>
                    <tr>
                      <th className={`${thCell} rounded-tl-card`}>Slip</th>
                      <th className={thCell}>Patient</th>
                      <th className={thCell}>Items</th>
                      <th className={`${thCell} text-right`}>Total</th>
                      <th className={`${thCell} rounded-tr-card`}>Handled by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => {
                      const items = (Array.isArray(s.items) ? s.items : []) as Item[];
                      const about = [s.patient_code, s.patient_phone, s.patient_age, s.patient_gender]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <tr key={s.id} className={trRow}>
                          <td className={tdCell}>
                            <span className="font-bold">{formatDateOfBirth(s.slip_date)}</span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {s.receipt_no ? (
                                <>
                                  Receipt <Code>{s.receipt_no}</Code>
                                </>
                              ) : (
                                "No receipt no."
                              )}
                            </span>
                          </td>
                          <td className={tdCell}>
                            <span className="font-bold">{s.patient_name || "—"}</span>
                            {about && (
                              <span className="mt-0.5 block text-xs text-muted">{about}</span>
                            )}
                            {s.patient_address && (
                              <span className="mt-0.5 block text-xs text-muted">
                                {s.patient_address}
                              </span>
                            )}
                          </td>
                          <td className={`${tdCell} min-w-64`}>
                            <details>
                              <summary className="font-semibold marker:text-muted">
                                {items.length === 0 ? "No items" : items[0]?.description || "Item"}
                                {items.length > 1 && (
                                  <span className="text-muted"> +{items.length - 1} more</span>
                                )}
                              </summary>
                              <ul className="mt-2 space-y-1.5 text-xs">
                                {items.map((it, i) => (
                                  <li key={i} className="flex justify-between gap-4">
                                    <span className="whitespace-pre-line">
                                      {it.description || "—"}
                                      {it.cost !== null && (
                                        <span className="block text-muted tabular">
                                          {taka(it.cost)} × {it.qty ?? 1}
                                        </span>
                                      )}
                                    </span>
                                    <span className="shrink-0 font-semibold tabular">
                                      {it.total !== null ? taka(it.total) : "—"}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          </td>
                          <td className={`${tdCell} whitespace-nowrap text-right font-extrabold tabular`}>
                            {taka(Number(s.total))}
                          </td>
                          <td className={tdCell}>
                            <Person
                              name={nameById.get(s.receptionist_id) ?? "Unknown"}
                              role="receptionist"
                            />
                            <span className="mt-0.5 block pl-8 text-[11px] font-semibold text-muted">
                              saved {formatClinicDate(s.created_at)},{" "}
                              {formatClinicTime(s.created_at)}
                            </span>
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
                  <Link href={href({ page: page - 1 })} className={btnGhost}>
                    ← Previous
                  </Link>
                ) : (
                  <span className={`${btnGhost} pointer-events-none opacity-40`}>← Previous</span>
                )}
                <span className="text-xs font-bold tabular text-muted">
                  Page {page} of {lastPage}
                </span>
                {page < lastPage ? (
                  <Link href={href({ page: page + 1 })} className={btnGhost}>
                    Next →
                  </Link>
                ) : (
                  <span className={`${btnGhost} pointer-events-none opacity-40`}>Next →</span>
                )}
              </nav>
            )}
          </section>
        </>
      )}
    </div>
  );
}
