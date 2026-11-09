import CallLogList, { CALLS_PER_PAGE } from "@/components/call-log-list";
import FollowUpList from "@/components/follow-up-list";
import { requireRole } from "@/lib/auth";
import { CALL_COLUMNS, type CallLog } from "@/lib/call-log";
import { applyCallFilters, callStats, getCallOptions, readCallFilters } from "@/lib/call-log-query";
import { clinicDayRange, clinicToday } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import { referCall } from "../call-actions";
import CallForm, { type CallPrefill } from "./call-form";

export const metadata = { title: "Call center" };

/**
 * The call center agent's desk: log a call, and see the calls they have
 * logged. Only their own — the read policy and the agent_id filter both say so.
 */
export default async function CallCenterPage({ searchParams }: PageProps<"/admin/call-center">) {
  const staff = await requireRole("call_center");
  const sp = await searchParams;
  // An agent sees only their own calls, so there is no agent filter here.
  const filters = { ...readCallFilters(sp), agent: "" };
  const pageParam = Number(typeof sp.page === "string" ? sp.page : "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * CALLS_PER_PAGE;

  // "Log follow-up" on a callback owed opens the form already filled in.
  const fu = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string).slice(0, 120) : "");
  const prefill: CallPrefill | undefined = fu("fu_phone")
    ? { customer_name: fu("fu_name"), phone: fu("fu_phone"), reason: "follow_up" }
    : undefined;

  const supabase = await createClient();
  const today = clinicToday();
  const [{ data, count, error }, stats, options] = await Promise.all([
    applyCallFilters(
      supabase
        .from("call_logs")
        .select(CALL_COLUMNS, { count: "exact" })
        .eq("agent_id", staff.id),
      filters,
    )
      .order("created_at", { ascending: false })
      .range(offset, offset + CALLS_PER_PAGE - 1),
    callStats(supabase, filters, { agentId: staff.id }, { day: today, start: clinicDayRange(today).start }),
    getCallOptions(supabase),
  ]);

  return (
    <div className="animate-rise space-y-6">
      <CallForm key={prefill?.phone ?? ""} prefill={prefill} options={options} />
      <FollowUpList
        options={options}
        items={stats.followUps}
        today={today}
        title="My follow-ups"
        hint="Callbacks you promised. One is done as soon as a newer call to that number is logged — use Log follow-up."
        logHref={(f) =>
          `/admin/call-center?${new URLSearchParams({ fu_name: f.customer_name, fu_phone: f.phone })}#log-call`
        }
      />
      {error ? (
        <p className="rounded-card border border-dashed border-hairline px-5 py-4 text-sm text-muted">
          Your calls cannot be shown yet. Ask the owner to finish setting up the call center.
        </p>
      ) : (
        <CallLogList
          options={options}
          title="My calls"
          hint="The calls you have logged, newest first."
          basePath="/admin/call-center"
          referAction={referCall}
          rows={(data ?? []) as unknown as CallLog[]}
          stats={stats}
          filters={filters}
          page={page}
          total={count ?? 0}
        />
      )}
    </div>
  );
}
