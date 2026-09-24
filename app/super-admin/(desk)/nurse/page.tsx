import Link from "next/link";
import { card, cardPad, Code, EmptyState, SectionHead } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";

/** Rough wait, so the desk can see who has been sitting longest. */
function waitedFor(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

export default async function NurseQueuePage({
  searchParams,
}: PageProps<"/super-admin/nurse">) {
  await requireRole("nurse");
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: waiting } = await supabase
    .from("visits")
    .select(
      "id, visit_code, visit_type, chief_complaint, created_at, patients(full_name, patient_code, age, phone)",
    )
    .eq("status", "awaiting_vitals")
    .order("created_at", { ascending: true });

  const queue = waiting ?? [];

  return (
    <div className="animate-rise space-y-5">
      {sp.done === "1" && (
        <p className="rounded-card border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok">
          Vitals saved — the patient is now with their doctor.
        </p>
      )}

      <section className={`${card} ${cardPad}`}>
        <SectionHead
          title="Awaiting vitals"
          hint="Oldest first. New check-ins arrive on their own."
          trailing={
            <span className="rounded-full bg-subtle px-3 py-1 text-xs font-medium text-muted">
              {queue.length} waiting
            </span>
          }
        />

        {queue.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="Nobody is waiting"
              hint="Patients appear here the moment reception checks them in — you do not need to refresh."
            />
          </div>
        ) : (
          <ul className="mt-5 space-y-2.5">
            {queue.map((v) => {
              const p = Array.isArray(v.patients) ? v.patients[0] : v.patients;
              return (
                <li key={v.id}>
                  <Link
                    href={`/super-admin/nurse/${v.id}`}
                    className="group flex flex-col gap-2 rounded-control border border-hairline bg-surface px-4 py-3.5 transition-ui hover:-translate-y-px hover:border-primary/60 hover:bg-primary-soft/50 hover:shadow-card sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <span className="font-bold transition-ui group-hover:text-primary">
                        {p?.full_name ?? "—"}
                      </span>
                      {p?.age != null && (
                        <span className="ml-2 text-xs text-muted">{p.age}y</span>
                      )}
                      <span className="mt-1 block text-xs text-muted">
                        <Code>{v.visit_code}</Code>
                        <span className="mx-1.5">·</span>
                        <Code>{p?.patient_code}</Code>
                        <span className="mx-1.5">·</span>
                        {v.visit_type}
                      </span>
                      {v.chief_complaint && (
                        <p className="mt-1.5 line-clamp-2 max-w-xl text-sm text-muted">
                          {v.chief_complaint}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      <span className="block text-sm font-medium tabular">
                        {waitedFor(v.created_at)}
                      </span>
                      <span className="block text-xs text-muted">
                        since {formatClinicTime(v.created_at)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
