import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getCallOptions } from "@/lib/call-log-query";
import { CLINIC_UTC_OFFSET } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import ImportForm from "./import-form";

export const metadata = { title: "Import calls" };

/** Brings old calls in from a CSV: a spreadsheet, or a file exported here. */
export default async function ImportCallsPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const [options, { data: people }] = await Promise.all([
    getCallOptions(supabase),
    supabase.from("staff_directory").select("id, full_name, role, is_active"),
  ]);
  // Call center agents first, then everyone else who could have taken calls.
  const agents = (people ?? [])
    .filter((p) => p.is_active || p.role === "call_center")
    .sort(
      (a, b) =>
        Number(b.role === "call_center") - Number(a.role === "call_center") ||
        String(a.full_name).localeCompare(String(b.full_name)),
    )
    .map((p) => ({ id: p.id as string, full_name: p.full_name as string }));

  return (
    <div className="space-y-6">
      <section className="hero animate-rise relative overflow-hidden rounded-card px-6 py-7 shadow-lift sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-hero-fg/60">
              Call center
            </p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-[28px]">Import calls</h1>
            <p className="mt-1 text-sm text-hero-fg/75">
              Bring in calls kept in a spreadsheet or a notebook before the call center was here.
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
      <ImportForm options={options} agents={agents} utcOffset={CLINIC_UTC_OFFSET} />
    </div>
  );
}
