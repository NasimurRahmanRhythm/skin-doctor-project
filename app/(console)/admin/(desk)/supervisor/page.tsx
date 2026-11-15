import Link from "next/link";
import { card, cardPad } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Supervisor" };

const DESKS = [
  {
    href: "/admin/owner/call-center",
    title: "Call center",
    body: "Every call logged, how calls ended, follow-ups owed and how each agent is doing. Export to CSV or Excel.",
  },
  {
    href: "/admin/owner/website-stats",
    title: "Website stats",
    body: "Visits, what people look at, how they get in touch, and which sources and ad campaigns bring inquiries.",
  },
];

/** A supervisor sees only these two, read only. */
export default async function SupervisorPage() {
  const staff = await requireRole("supervisor");

  return (
    <div className="space-y-6">
      <section className="hero animate-rise relative overflow-hidden rounded-card px-6 py-7 shadow-lift sm:px-8 sm:py-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-hero-fg/60">Supervisor</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-[28px]">Hello, {staff.full_name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-hero-fg/75">Pick what you want to look at.</p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DESKS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className={`${card} ${cardPad} group block transition-ui hover:border-primary/40 hover:shadow-lift`}
          >
            <h2 className="flex items-center justify-between text-lg font-extrabold">
              {d.title}
              <span aria-hidden="true" className="text-primary transition-ui group-hover:translate-x-0.5">
                →
              </span>
            </h2>
            <p className="mt-1.5 text-sm text-muted">{d.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
