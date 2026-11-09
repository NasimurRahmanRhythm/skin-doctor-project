import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import OptionsCard, { type OptionRow } from "./options-card";

export const metadata = { title: "Call form options" };

/** The owner's Reason and Outcome lists for the call center's form. */
export default async function CallOptionsPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("call_options")
    .select("id, kind, value, label, is_active, built_in")
    .order("sort_order")
    .order("created_at");
  const rows = (data ?? []) as (OptionRow & { kind: string })[];

  return (
    <div className="space-y-6">
      <section className="hero animate-rise relative overflow-hidden rounded-card px-6 py-7 shadow-lift sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-hero-fg/60">
              Call center
            </p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-[28px]">Form options</h1>
            <p className="mt-1 text-sm text-hero-fg/75">
              The choices agents pick from for Reason and Outcome.
            </p>
          </div>
          <Link
            href="/admin/owner/call-center"
            className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
          >
            <span aria-hidden="true">←</span>
            Back to calls
          </Link>
        </div>
      </section>

      {error ? (
        <p className="rounded-card border border-dashed border-hairline px-5 py-4 text-sm text-muted">
          Run migration 20261108000032 in Supabase to edit these lists.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <OptionsCard
            kind="reason"
            title="Reason"
            hint="Why the customer called. Rename one and every call shows the new name; turn one off and it is no longer offered, but old calls keep it."
            rows={rows.filter((r) => r.kind === "reason")}
          />
          <OptionsCard
            kind="outcome"
            title="Outcome"
            hint="How the call ended. “Sold” counts as a sale in the reports; “Callback needed” is the usual one for follow-ups."
            rows={rows.filter((r) => r.kind === "outcome")}
          />
        </div>
      )}
    </div>
  );
}
