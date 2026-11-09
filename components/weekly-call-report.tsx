import Link from "next/link";
import ColumnChart from "@/components/column-chart";
import { btnGhost, card, cardPad, SectionHead } from "@/components/ui";
import type { CallReport, FollowUp } from "@/lib/call-log";
import { clinicDayRange, clinicToday } from "@/lib/clinic";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const DAY = 86_400_000;
const addDays = (day: string, n: number) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + n * DAY).toISOString().slice(0, 10);
/** The Monday of the week a day falls in. */
const mondayOf = (day: string) => addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
const fmt = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(new Date(`${day}T00:00:00Z`));

/** The week the dashboard shows: ?week=<any day in it>, or this week. */
export function readWeek(param: unknown): string {
  const today = clinicToday();
  const thisWeek = mondayOf(today);
  if (typeof param !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return thisWeek;
  const week = mondayOf(param);
  return week > thisWeek ? thisWeek : week;
}

type Week = {
  report: CallReport;
  referred: number;
};

async function loadWeek(supabase: Supabase, monday: string): Promise<Week | null> {
  const sunday = addDays(monday, 6);
  const [report, referred] = await Promise.all([
    supabase.rpc("call_center_report", { p_from: monday, p_to: sunday }),
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .gte("referred_at", clinicDayRange(monday).start)
      .lt("referred_at", clinicDayRange(sunday).end),
  ]);
  if (report.error || !report.data) return null;
  return { report: report.data as CallReport, referred: referred.count ?? 0 };
}

const totals = (w: Week) => {
  const calls = w.report.days.reduce((n, d) => n + d.calls, 0);
  const sold = Number(w.report.outcomes.sold ?? 0);
  const minutes = w.report.agents.reduce(
    (sum, a) => sum + (a.avg_duration != null ? Number(a.avg_duration) * a.calls : 0),
    0,
  );
  const timed = w.report.agents.reduce((n, a) => n + (a.avg_duration != null ? a.calls : 0), 0);
  return {
    calls,
    sold,
    conversion: calls ? Math.round((sold / calls) * 100) : 0,
    referred: w.referred,
    complaints: Number(w.report.reasons.complaint ?? 0),
    avgMinutes: timed ? Math.round((minutes / timed) * 10) / 10 : null,
  };
};

/**
 * One week's number against the week before. `upIsGood` says which way is
 * good news: more sales are, more complaints are not. The change is written
 * out with an arrow, never shown by colour alone.
 */
function Kpi({
  label,
  value,
  before,
  suffix = "",
  upIsGood = true,
}: {
  label: string;
  value: number | null;
  before: number | null;
  suffix?: string;
  /** null: neither way is good or bad, so the change stays grey. */
  upIsGood?: boolean | null;
}) {
  const diff = value != null && before != null ? Math.round((value - before) * 10) / 10 : null;
  const good = diff === null || diff === 0 || upIsGood === null ? null : diff > 0 === upIsGood;
  return (
    <div className="rounded-control border border-hairline bg-subtle/50 px-4 py-3">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className="mt-1 block text-2xl font-extrabold tabular leading-none">
        {value ?? "—"}
        {value != null && suffix}
      </span>
      <span
        className={`mt-1.5 block text-xs font-bold tabular ${
          good === null ? "text-muted" : good ? "text-ok" : "text-danger"
        }`}
      >
        {diff === null
          ? "—"
          : diff === 0
            ? "Same as last week"
            : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)}${suffix} vs last week`}
      </span>
    </div>
  );
}

/**
 * The owner dashboard's weekly call center report (Monday to Sunday): the
 * week's numbers against the week before, calls per day, the best agents,
 * and the follow-ups overdue right now. Arrows step back and forth by week.
 */
export default async function WeeklyCallReport({
  supabase,
  monday,
  agentNameById,
  hrefForWeek,
}: {
  supabase: Supabase;
  monday: string;
  agentNameById: Map<string, string>;
  hrefForWeek: (monday: string) => string;
}) {
  const [week, prev, followUps] = await Promise.all([
    loadWeek(supabase, monday),
    loadWeek(supabase, addDays(monday, -7)),
    supabase.rpc("call_follow_ups"),
  ]);
  // Not set up yet (the call center migrations have not run): say nothing.
  if (!week) return null;

  const now = totals(week);
  const before = prev ? totals(prev) : null;
  const today = clinicToday();
  const thisWeek = mondayOf(today);
  const overdue = ((followUps.data ?? []) as FollowUp[]).filter((f) => f.follow_up_date < today).length;
  const sunday = addDays(monday, 6);

  const bySold = [...week.report.agents].sort((a, b) => b.sold - a.sold || b.calls - a.calls)[0];
  const byCalls = [...week.report.agents].sort((a, b) => b.calls - a.calls)[0];
  const name = (id?: string) => (id ? agentNameById.get(id) ?? "Unknown" : "—");

  return (
    <section className={`${card} ${cardPad}`}>
      <SectionHead
        title="Call center this week"
        hint={`Mon ${fmt(monday, { day: "numeric", month: "short" })} – Sun ${fmt(sunday, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}${monday === thisWeek ? " · so far" : ""}`}
        trailing={
          <div className="flex items-center gap-2">
            <Link href={hrefForWeek(addDays(monday, -7))} className={`${btnGhost} px-3 py-1.5 text-xs`}>
              ← Previous week
            </Link>
            {monday < thisWeek ? (
              <Link href={hrefForWeek(addDays(monday, 7))} className={`${btnGhost} px-3 py-1.5 text-xs`}>
                Next week →
              </Link>
            ) : (
              <span className={`${btnGhost} pointer-events-none px-3 py-1.5 text-xs opacity-40`}>Next week →</span>
            )}
          </div>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Calls" value={now.calls} before={before?.calls ?? null} />
        <Kpi label="Sold" value={now.sold} before={before?.sold ?? null} />
        <Kpi label="Conversion" value={now.conversion} before={before?.conversion ?? null} suffix="%" />
        <Kpi label="Sent to reception" value={now.referred} before={before?.referred ?? null} />
        <Kpi label="Complaints" value={now.complaints} before={before?.complaints ?? null} upIsGood={false} />
        <Kpi label="Avg minutes" value={now.avgMinutes} before={before?.avgMinutes ?? null} upIsGood={null} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 rounded-control border border-hairline p-4">
          <h3 className="text-sm font-extrabold">Calls per day</h3>
          <div className="mt-4">
            <ColumnChart
              ariaLabel={`Calls per day, ${now.calls} this week`}
              height={120}
              columns={week.report.days.map((d) => ({
                key: d.day,
                label: fmt(d.day, { weekday: "short" }),
                value: d.calls,
                tip: `${fmt(d.day, { weekday: "long", day: "numeric", month: "short" })}: ${d.calls} ${
                  d.calls === 1 ? "call" : "calls"
                }`,
              }))}
            />
          </div>
        </div>
        <div className="space-y-3 rounded-control border border-hairline p-4 text-sm">
          <h3 className="text-sm font-extrabold">Highlights</h3>
          <p>
            <span className="text-muted">Most sales:</span>{" "}
            <span className="font-bold">{bySold && bySold.sold > 0 ? `${name(bySold.agent_id)} (${bySold.sold})` : "—"}</span>
          </p>
          <p>
            <span className="text-muted">Most calls:</span>{" "}
            <span className="font-bold">{byCalls ? `${name(byCalls.agent_id)} (${byCalls.calls})` : "—"}</span>
          </p>
          <p>
            <span className="text-muted">Follow-ups overdue now:</span>{" "}
            <span className={`font-bold ${overdue > 0 ? "text-danger" : ""}`}>
              {overdue > 0 ? `⚠ ${overdue}` : "None"}
            </span>
          </p>
          <Link
            href={`/admin/owner/call-center?from=${monday}&to=${sunday > today ? today : sunday}`}
            className="inline-block pt-1 text-sm font-bold text-primary hover:underline"
          >
            Open this week&rsquo;s calls →
          </Link>
        </div>
      </div>
    </section>
  );
}
