import Link from "next/link";
import { card, cardPad, SectionHead } from "@/components/ui";
import { optionLabel, telHref, whatsappHref, type CallOptions, type FollowUp } from "@/lib/call-log";
import { formatDateOfBirth } from "@/lib/clinic";

/** Splits callbacks into overdue, due today and coming up, against the clinic's today. */
export function groupFollowUps(items: FollowUp[], today: string) {
  return {
    overdue: items.filter((f) => f.follow_up_date < today),
    today: items.filter((f) => f.follow_up_date === today),
    upcoming: items.filter((f) => f.follow_up_date > today),
  };
}

function Group({
  title,
  tone,
  items,
  agentNameById,
  logHref,
  options,
}: {
  options: CallOptions;
  title: string;
  tone: "danger" | "warn" | "muted";
  items: FollowUp[];
  agentNameById?: Map<string, string>;
  logHref?: (f: FollowUp) => string;
}) {
  if (items.length === 0) return null;
  const color = { danger: "text-danger", warn: "text-warn", muted: "text-muted" }[tone];
  return (
    <div>
      <h3 className={`text-xs font-extrabold uppercase tracking-wider ${color}`}>
        {title} · {items.length}
      </h3>
      <ul className="mt-2 divide-y divide-hairline rounded-control border border-hairline">
        {items.map((f) => {
          const wa = whatsappHref(f.phone);
          return (
            <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3.5 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-bold">{f.customer_name}</span>{" "}
                <a href={telHref(f.phone)} className="tabular text-primary hover:underline">
                  {f.phone}
                </a>
                <span className="block text-xs text-muted">
                  Due {formatDateOfBirth(f.follow_up_date)} · {optionLabel(options.reasons, f.reason)} ·{" "}
                  {optionLabel(options.outcomes, f.outcome)}
                  {agentNameById ? ` · ${agentNameById.get(f.agent_id) ?? "Unknown"}` : ""}
                  {f.notes ? ` · “${f.notes.length > 80 ? `${f.notes.slice(0, 80)}…` : f.notes}”` : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3 text-xs font-bold">
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="text-ok hover:underline">
                    WhatsApp
                  </a>
                )}
                {logHref && (
                  <Link href={logHref(f)} className="text-primary hover:underline">
                    Log follow-up →
                  </Link>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Callbacks still owed. One is done once a newer call to that number is
 * logged — "Log follow-up" opens the form filled in for exactly that.
 */
export default function FollowUpList({
  items,
  today,
  title,
  hint,
  agentNameById,
  logHref,
  showUpcoming = true,
  options,
}: {
  options: CallOptions;
  items: FollowUp[];
  today: string;
  title: string;
  hint: string;
  agentNameById?: Map<string, string>;
  logHref?: (f: FollowUp) => string;
  showUpcoming?: boolean;
}) {
  const g = groupFollowUps(items, today);
  const empty = g.overdue.length + g.today.length + (showUpcoming ? g.upcoming.length : 0) === 0;
  return (
    <section className={`${card} ${cardPad}`}>
      <SectionHead title={title} hint={hint} />
      <div className="mt-5 space-y-5">
        {empty ? (
          <p className="text-sm text-muted">No follow-ups owed. Nice.</p>
        ) : (
          <>
            <Group title="Overdue" tone="danger" items={g.overdue} agentNameById={agentNameById} logHref={logHref} options={options} />
            <Group title="Due today" tone="warn" items={g.today} agentNameById={agentNameById} logHref={logHref} options={options} />
            {showUpcoming && (
              <Group title="Coming up" tone="muted" items={g.upcoming} agentNameById={agentNameById} logHref={logHref} options={options} />
            )}
          </>
        )}
      </div>
    </section>
  );
}
