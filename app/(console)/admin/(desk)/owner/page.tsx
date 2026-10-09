import Link from "next/link";
import VisitSearch from "@/components/visit-search";
import { requireRole } from "@/lib/auth";
import { clinicDayRange, formatClinicDate } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";

/**
 * A tile on the dark band. The dot carries the same colour the status pill
 * uses further down the page, so "with nurse" is one idea in two places.
 */
function Stat({
  label,
  value,
  dot,
}: {
  label: string;
  value: string | number;
  dot: string;
}) {
  return (
    <div className="rounded-control border border-white/15 bg-white/10 px-4 py-3.5 transition-ui hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.16]">
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-hero-fg/75">
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </span>
      <span className="mt-2 block text-3xl font-extrabold tabular leading-none">
        {value}
      </span>
    </div>
  );
}

const heroLink =
  "inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20";

export default async function OwnerPage({
  searchParams,
}: PageProps<"/admin/owner">) {
  await requireRole("owner");
  const sp = await searchParams;

  const supabase = await createClient();
  const today = clinicDayRange();

  // ---- today's snapshot -------------------------------------------------
  const { data: todayVisits } = await supabase
    .from("visits")
    .select("status")
    .gte("created_at", today.start)
    .lt("created_at", today.end);

  // Website inquiries waiting to be read. Null until the migration has run.
  const { count: unreadInquiries } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  const counts = { awaiting_vitals: 0, awaiting_doctor: 0, completed: 0 };
  for (const v of todayVisits ?? []) {
    counts[v.status as keyof typeof counts]++;
  }

  return (
    <div className="space-y-6">
      <section className="hero animate-rise relative overflow-hidden rounded-card px-6 py-7 shadow-lift sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-hero-fg/60">
              Owner dashboard
            </p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-[28px]">
              Today at the clinic
            </h1>
            <p className="mt-1 text-sm text-hero-fg/75">
              {formatClinicDate(today.start)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin/owner/inquiries" className={heroLink}>
              Inquiries
              {(unreadInquiries ?? 0) > 0 && (
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-fg">
                  {unreadInquiries} new
                </span>
              )}
            </Link>
            <Link href="/admin/owner/payments" className={heroLink}>
              Payments
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/admin/owner/website" className={heroLink}>
              Website
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/admin/owner/staff" className={heroLink}>
              Manage staff
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Checked in"
            value={(todayVisits ?? []).length}
            dot="bg-white/70"
          />
          <Stat label="With nurse" value={counts.awaiting_vitals} dot="bg-amber-300" />
          <Stat label="With doctor" value={counts.awaiting_doctor} dot="bg-sky-300" />
          <Stat label="Completed" value={counts.completed} dot="bg-emerald-300" />
        </div>
      </section>

      <VisitSearch searchParams={sp} basePath="/admin/owner" />
    </div>
  );
}
