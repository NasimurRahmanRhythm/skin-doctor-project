import ColumnChart from "@/components/column-chart";
import { card, cardPad, SectionHead, tableEl, tableWrap, tdCell, thCell, trRow } from "@/components/ui";
import { optionLabel, type CallOptions, type CallReport } from "@/lib/call-log";
import { formatDateOfBirth } from "@/lib/clinic";

/** "8 Nov" from 2026-11-08. */
const shortDay = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(
    new Date(`${day}T00:00:00Z`),
  );

/** "2 pm" from 14. */
const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

/**
 * A ranked list of bars, one hue, each with its label and number written out,
 * so it reads without hovering or a legend.
 */
export function BarList({
  rows,
  total,
  empty = "No calls in this range.",
}: {
  rows: { label: string; value: number }[];
  total: number;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-fg">{r.label}</span>
          <span className="h-3 rounded-r-[4px] bg-subtle">
            <span
              className="block h-full rounded-r-[4px] bg-primary/75"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </span>
          <span className="text-right text-xs font-bold tabular text-muted">
            {r.value}
            <span className="font-medium"> · {Math.round((r.value / Math.max(1, total)) * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-control border border-hairline p-4">
      <h3 className="text-sm font-extrabold">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/**
 * The owner's call center overview for a date range: calls per day, what the
 * calls were about and how they ended, when they come in, and how each agent
 * is doing.
 */
export default function CallReportView({
  report,
  from,
  to,
  agentNameById,
  options,
}: {
  options: CallOptions;
  report: CallReport;
  from: string;
  to: string;
  agentNameById: Map<string, string>;
}) {
  const total = report.days.reduce((n, d) => n + d.calls, 0);
  const sold = report.outcomes.sold ?? 0;
  const ranked = (counts: Record<string, number>, list: readonly { value: string; label: string }[]) =>
    Object.entries(counts)
      .map(([k, v]) => ({ label: optionLabel(list, k), value: Number(v) }))
      .sort((a, b) => b.value - a.value);

  // Clinic hours and around them; any call outside still widens the range.
  const hoursWithCalls = Object.keys(report.hours).map(Number);
  const firstHour = Math.min(9, ...hoursWithCalls);
  const lastHour = Math.max(21, ...hoursWithCalls);
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);

  return (
    <section className={`${card} ${cardPad}`}>
      <SectionHead
        title="Overview"
        hint={`${formatDateOfBirth(from)} – ${formatDateOfBirth(to)} · ${total} ${total === 1 ? "call" : "calls"} · ${sold} sold (${Math.round((sold / Math.max(1, total)) * 100)}%). Change the dates in the filters below.`}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0 lg:col-span-2">
          <Panel title="Calls per day">
            <ColumnChart
              ariaLabel={`Calls per day, ${total} in total`}
              labelEvery={Math.max(1, Math.ceil(report.days.length / 5))}
              columns={report.days.map((d) => ({
                key: d.day,
                label: shortDay(d.day),
                value: d.calls,
                tip: `${shortDay(d.day)}: ${d.calls} ${d.calls === 1 ? "call" : "calls"}`,
              }))}
            />
          </Panel>
        </div>
        <Panel title="How calls ended">
          <BarList rows={ranked(report.outcomes, options.outcomes)} total={total} />
        </Panel>
        <Panel title="Why people called">
          <BarList rows={ranked(report.reasons, options.reasons)} total={total} />
        </Panel>
        <div className="min-w-0 lg:col-span-2">
          <Panel title="Busiest hours" hint="When calls were logged, clinic time.">
            <ColumnChart
              ariaLabel="Calls by hour of the day"
              height={110}
              labelEvery={2}
              columns={hours.map((h) => {
                const n = Number(report.hours[String(h)] ?? 0);
                return {
                  key: String(h),
                  label: hourLabel(h),
                  value: n,
                  tip: `${hourLabel(h)}–${hourLabel((h + 1) % 24)}: ${n} ${n === 1 ? "call" : "calls"}`,
                };
              })}
            />
          </Panel>
        </div>
      </div>

      <h3 className="mt-7 text-sm font-extrabold">Agent performance</h3>
      <p className="mt-0.5 text-xs text-muted">
        Conversion is sold calls out of all calls. Follow-ups are callbacks still owed today, whatever the dates above.
      </p>
      <div className={`mt-3 ${tableWrap}`}>
        <table className={`${tableEl} min-w-[760px]`}>
          <thead>
            <tr>
              <th className={`${thCell} rounded-tl-card`}>Agent</th>
              <th className={`${thCell} text-right`}>Calls</th>
              <th className={`${thCell} text-right`}>Sold</th>
              <th className={`${thCell} text-right`}>Conversion</th>
              <th className={`${thCell} text-right`}>Avg min</th>
              <th className={`${thCell} text-right`}>Follow-ups owed</th>
              <th className={`${thCell} rounded-tr-card text-right`}>Overdue</th>
            </tr>
          </thead>
          <tbody>
            {report.agents.length === 0 ? (
              <tr>
                <td colSpan={7} className={`${tdCell} text-center text-muted`}>
                  No calls in this range.
                </td>
              </tr>
            ) : (
              report.agents.map((a) => {
                const rate = Math.round((a.sold / Math.max(1, a.calls)) * 100);
                return (
                  <tr key={a.agent_id} className={trRow}>
                    <td className={`${tdCell} font-semibold`}>{agentNameById.get(a.agent_id) ?? "Unknown"}</td>
                    <td className={`${tdCell} text-right font-bold tabular`}>{a.calls}</td>
                    <td className={`${tdCell} text-right tabular`}>{a.sold}</td>
                    <td className={`${tdCell} text-right tabular`}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-14 rounded-full bg-subtle">
                          <span className="block h-full rounded-full bg-primary/75" style={{ width: `${rate}%` }} />
                        </span>
                        {rate}%
                      </span>
                    </td>
                    <td className={`${tdCell} text-right tabular`}>
                      {a.avg_duration != null ? Number(a.avg_duration) : "—"}
                    </td>
                    <td className={`${tdCell} text-right tabular`}>{a.open_follow_ups}</td>
                    <td className={`${tdCell} text-right font-bold tabular ${a.overdue > 0 ? "text-danger" : "text-muted"}`}>
                      {a.overdue > 0 ? `⚠ ${a.overdue}` : "0"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
