import Link from "next/link";
import { card, cardPad, Code, EmptyState, SectionHead } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { clinicDayRange, formatClinicTime, patientAge } from "@/lib/clinic";
import { SKIN_CONDITIONS, skinLabels } from "@/lib/skin";
import { createClient } from "@/lib/supabase/server";

export default async function DoctorQueuePage() {
  const staff = await requireRole("doctor");
  const supabase = await createClient();
  const { start } = clinicDayRange();

  // RLS already limits this to visits assigned to this doctor.
  const [{ data: waiting }, { data: done }] = await Promise.all([
    supabase
      .from("visits")
      .select(
        "id, visit_code, visit_type, chief_complaint, skin_conditions, intake_notes, created_at, vitals_at, blood_pressure, patients(full_name, patient_code, age, date_of_birth)",
      )
      .eq("status", "awaiting_doctor")
      .order("vitals_at", { ascending: true }),
    supabase
      .from("visits")
      .select("id, visit_code, completed_at, patients(full_name)")
      .eq("status", "completed")
      .gte("created_at", start)
      .order("completed_at", { ascending: false }),
  ]);

  const queue = waiting ?? [];
  const finished = done ?? [];

  return (
    <div className="animate-rise space-y-5">
      <section className={`${card} ${cardPad}`}>
        <SectionHead
          title="Ready for you"
          hint={`${staff.full_name}${staff.specialty ? ` · ${staff.specialty}` : ""} — patients arrive once the nurse has taken vitals.`}
          trailing={
            <span className="rounded-full bg-subtle px-3 py-1 text-xs font-medium text-muted">
              {queue.length} waiting
            </span>
          }
        />

        {queue.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="Your queue is clear"
              hint="The next patient appears here automatically, with a sound, as soon as their vitals are recorded."
            />
          </div>
        ) : (
          <ul className="mt-5 space-y-2.5">
            {queue.map((v) => {
              const p = Array.isArray(v.patients) ? v.patients[0] : v.patients;
              return (
                <li key={v.id}>
                  <Link
                    href={`/super-admin/doctor/${v.id}`}
                    className="group flex flex-col gap-2 rounded-control border border-hairline bg-surface px-4 py-3.5 transition-ui hover:-translate-y-px hover:border-primary/60 hover:bg-primary-soft/50 hover:shadow-card sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <span className="font-bold transition-ui group-hover:text-primary">
                        {p?.full_name ?? "—"}
                      </span>
                      {p && patientAge(p) != null && (
                        <span className="ml-2 text-xs text-muted">{patientAge(p)}y</span>
                      )}
                      <span className="mt-1 block text-xs text-muted">
                        <Code>{v.visit_code}</Code>
                        <span className="mx-1.5">·</span>
                        {v.visit_type}
                        {v.blood_pressure && (
                          <>
                            <span className="mx-1.5">·</span>
                            BP <Code>{v.blood_pressure}</Code>
                          </>
                        )}
                      </span>
                      {(v.skin_conditions?.length > 0 ||
                        v.intake_notes ||
                        v.chief_complaint) && (
                        <p className="mt-1.5 line-clamp-2 max-w-xl text-sm text-muted">
                          {[
                            skinLabels(v.skin_conditions, SKIN_CONDITIONS),
                            v.intake_notes ?? v.chief_complaint,
                          ]
                            .filter(Boolean)
                            .join(" — ")}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      ready {v.vitals_at ? formatClinicTime(v.vitals_at) : "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {finished.length > 0 && (
        <section className={`${card} ${cardPad}`}>
          <SectionHead title="Completed today" />
          <ul className="mt-4 divide-y divide-hairline">
            {finished.map((v) => {
              const p = Array.isArray(v.patients) ? v.patients[0] : v.patients;
              return (
                <li key={v.id}>
                  <Link
                    href={`/super-admin/doctor/${v.id}`}
                    className="flex items-baseline justify-between gap-3 py-2.5 text-sm hover:text-primary"
                  >
                    <span className="truncate">
                      {p?.full_name ?? "—"}
                      <Code className="ml-2 text-muted">{v.visit_code}</Code>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {v.completed_at ? formatClinicTime(v.completed_at) : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
