import type { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_CALL_OPTIONS,
  OPTION_VALUE,
  type CallOption,
  type CallOptions,
  type FollowUp,
} from "@/lib/call-log";
import { clinicDayRange } from "@/lib/clinic";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The call list's filters, as they travel in the URL. */
export type CallFilters = {
  q: string;
  agent: string;
  outcome: string;
  from: string;
  to: string;
};

/** Reads the filters from a page's search params, dropping anything malformed. */
export function readCallFilters(sp: Record<string, string | string[] | undefined>): CallFilters {
  const str = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string).trim() : "");
  const q = str("q").slice(0, 80);
  const agent = UUID.test(str("agent")) ? str("agent") : "";
  const outcome = OPTION_VALUE.test(str("outcome")) ? str("outcome") : "";
  const from = DATE.test(str("from")) ? str("from") : "";
  const to = DATE.test(str("to")) ? str("to") : "";
  return { q, agent, outcome, from, to };
}

/** The same filters, back into a query string (empty ones left out). */
export function callFilterParams(f: CallFilters, page = 1): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) params.set(k, v);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

/**
 * Narrows a call_logs query to the filters. Dates are the call's day at the
 * clinic, so "from 1 Nov" starts at midnight in Dhaka.
 * The search text is stripped of the characters PostgREST's or() syntax uses.
 */
export function applyCallFilters<
  Q extends {
    eq(column: string, value: string): Q;
    gte(column: string, value: string): Q;
    lt(column: string, value: string): Q;
    or(filters: string): Q;
  },
>(query: Q, f: CallFilters): Q {
  let q = query;
  if (f.agent) q = q.eq("agent_id", f.agent);
  if (f.outcome) q = q.eq("outcome", f.outcome);
  if (f.from) q = q.gte("created_at", clinicDayRange(f.from).start);
  if (f.to) q = q.lt("created_at", clinicDayRange(f.to).end);
  const term = f.q.replace(/[,()*%\\"]/g, " ").trim();
  if (term) {
    const like = `*${term}*`;
    q = q.or(
      ["customer_name", "phone", "notes", "product"].map((c) => `${c}.ilike.${like}`).join(","),
    );
  }
  return q;
}

/**
 * Total, today and sold over the filtered calls, plus follow-ups due: the
 * callbacks still owed (no newer call to that number) dated today or before.
 * Follow-ups come from call_follow_ups(), which the database scopes to the
 * caller — an agent's own, or everyone's for the owner.
 */
export async function callStats(
  supabase: Supabase,
  f: CallFilters,
  scope: { agentId?: string },
  today: { day: string; start: string },
) {
  const base = () => {
    let q = supabase.from("call_logs").select("id", { count: "exact", head: true });
    if (scope.agentId) q = q.eq("agent_id", scope.agentId);
    return applyCallFilters(q, f);
  };
  const [total, todays, sold, followUps] = await Promise.all([
    base(),
    base().gte("created_at", today.start),
    base().eq("outcome", "sold"),
    supabase.rpc("call_follow_ups"),
  ]);
  const owed = ((followUps.data ?? []) as FollowUp[]).filter(
    (u) => !f.agent || u.agent_id === f.agent,
  );
  return {
    total: total.count ?? 0,
    today: todays.count ?? 0,
    sold: sold.count ?? 0,
    due: owed.filter((u) => u.follow_up_date <= today.day).length,
    followUps: owed,
  };
}

/**
 * The owner's Reason and Outcome lists, in their order, turned-off ones
 * included (old calls still carry them). The starting set until migration
 * 20261108000032 creates call_options.
 */
export async function getCallOptions(supabase: Supabase): Promise<CallOptions> {
  const { data, error } = await supabase
    .from("call_options")
    .select("kind, value, label, is_active, built_in")
    .order("sort_order")
    .order("created_at");
  if (error || !data) return DEFAULT_CALL_OPTIONS;
  const of = (kind: string): CallOption[] =>
    data
      .filter((o) => o.kind === kind)
      .map((o) => ({ value: o.value, label: o.label, active: o.is_active, builtIn: o.built_in }));
  return { reasons: of("reason"), outcomes: of("outcome") };
}
