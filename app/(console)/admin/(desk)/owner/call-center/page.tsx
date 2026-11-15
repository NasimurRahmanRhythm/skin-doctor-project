import Link from "next/link";
import CallLogList, { CALLS_PER_PAGE } from "@/components/call-log-list";
import CallReportView from "@/components/call-report";
import FollowUpList from "@/components/follow-up-list";
import { requireRole, ROLE_HOME } from "@/lib/auth";
import { CALL_COLUMNS, cleanFields, type CallLog, type CallReport } from "@/lib/call-log";
import { applyCallFilters, callStats, getCallOptions, readCallFilters } from "@/lib/call-log-query";
import { clinicDayRange, clinicToday } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import { referCall } from "../../call-actions";
import { deleteCall } from "./actions";
import ExportDialog from "./export-dialog";

export const metadata = { title: "Call center" };

/**
 * Every call the call center has logged, with filters, pages and the CSV
 * export. A supervisor sees the same, read only: no delete, import, form
 * options or sending to reception.
 */
export default async function OwnerCallCenterPage({
  searchParams,
}: PageProps<"/admin/owner/call-center">) {
  const owner = await requireRole("owner", "supervisor");
  const isOwner = owner.role === "owner";
  const sp = await searchParams;
  const filters = readCallFilters(sp);
  const pageParam = Number(typeof sp.page === "string" ? sp.page : "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * CALLS_PER_PAGE;

  const supabase = await createClient();
  const today = clinicToday();
  // The overview covers the filter's dates, or the last 30 days without them.
  const reportTo = filters.to || today;
  const reportFrom =
    filters.from ||
    new Date(new Date(`${reportTo}T00:00:00Z`).getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const base = supabase.from("call_logs").select(CALL_COLUMNS, { count: "exact" });
  const query = applyCallFilters(base, filters);
  const [{ data, count, error }, stats, { data: people }, { data: prefs }, { data: report }, options] = await Promise.all([
    query.order("created_at", { ascending: false }).range(offset, offset + CALLS_PER_PAGE - 1),
    callStats(supabase, filters, {}, { day: today, start: clinicDayRange(today).start }),
    supabase.from("staff_directory").select("id, full_name, role"),
    supabase.from("staff").select("call_export_fields").eq("id", owner.id).maybeSingle(),
    // Errors (and is left out) until migration 20261108000030 has run.
    supabase.rpc("call_center_report", { p_from: reportFrom, p_to: reportTo }),
    getCallOptions(supabase),
  ]);

  const agentNameById = new Map((people ?? []).map((p) => [p.id as string, p.full_name as string]));
  const rows = (data ?? []) as unknown as CallLog[];
  // Anyone who has logged a call stays pickable after they leave the team.
  const agents = (people ?? [])
    .filter((p) => p.role === "call_center" || rows.some((r) => r.agent_id === p.id))
    .map((p) => ({ id: p.id as string, full_name: p.full_name as string }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const total = count ?? 0;

  return (
    <div className="space-y-6">
      <section className="hero animate-rise relative overflow-hidden rounded-card px-6 py-7 shadow-lift sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-hero-fg/60">
              Call center
            </p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-[28px]">Calls</h1>
            <p className="mt-1 text-sm text-hero-fg/75">
              {stats.total} {stats.total === 1 ? "call" : "calls"} · {stats.today} today
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(isOwner
              ? [
                  { href: "/admin/owner/call-center/import", label: "Import calls" },
                  { href: "/admin/owner/call-center/options", label: "Form options" },
                ]
              : [{ href: "/admin/owner/website-stats", label: "Website stats" }]
            ).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
              >
                {l.label}
                <span aria-hidden="true">→</span>
              </Link>
            ))}
            <Link
              href={ROLE_HOME[owner.role]}
              className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
            >
              <span aria-hidden="true">←</span>
              Dashboard
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-card border border-dashed border-hairline px-5 py-4 text-sm text-muted">
          Run the call center migrations (20261108000028 to 20261108000032, in order) in Supabase to see calls here.
        </p>
      ) : (
        <>
          {report && (
            <CallReportView
              options={options}
              report={report as CallReport}
              from={reportFrom}
              to={reportTo}
              agentNameById={agentNameById}
            />
          )}
          <FollowUpList
            options={options}
            items={stats.followUps}
            today={today}
            title="Follow-ups owed"
            hint="Callbacks the agents promised and have not logged yet. A follow-up closes when a newer call to that number is logged."
            agentNameById={agentNameById}
            showUpcoming={false}
          />
          <CallLogList
            options={options}
            title="All calls"
            hint={
              isOwner
                ? "Newest first. Delete only a call logged by mistake — it cannot be undone."
                : "Newest first."
            }
            basePath="/admin/owner/call-center"
            referAction={isOwner ? referCall : undefined}
            rows={rows}
            stats={stats}
            filters={filters}
            page={page}
            total={total}
            agents={agents}
            agentNameById={agentNameById}
            deleteAction={isOwner ? deleteCall : undefined}
            trailing={
              <ExportDialog
                filters={filters}
                saved={cleanFields(prefs?.call_export_fields)}
                total={total}
              />
            }
          />
        </>
      )}
    </div>
  );
}
