import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { clinicDayRange, formatClinicTime } from "@/lib/clinic";
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
        "id, visit_code, visit_type, chief_complaint, created_at, vitals_at, blood_pressure, patients(full_name, patient_code, age)",
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
    <div className="space-y-6">
      <section className="border border-line bg-paper px-8 py-7 rounded-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-xl">Ready for you</h1>
          <span className="text-sm text-ink-soft">{queue.length} waiting</span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {staff.full_name}
          {staff.specialty ? ` · ${staff.specialty}` : ""} — patients appear
          once the nurse has taken their vitals.
        </p>

        {queue.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">
            Nobody is waiting for you right now.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line">
            {queue.map((v) => {
              const p = Array.isArray(v.patients) ? v.patients[0] : v.patients;
              return (
                <li key={v.id} className="py-4">
                  <Link
                    href={`/super-admin/doctor/${v.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 hover:opacity-75"
                  >
                    <div>
                      <span className="font-serif text-lg">
                        {p?.full_name ?? "—"}
                      </span>
                      <span className="ml-3 text-xs text-ink-soft">
                        {v.visit_code} · {p?.patient_code} ·{" "}
                        {p?.age != null ? `age ${p.age}` : "age —"} ·{" "}
                        {v.visit_type}
                        {v.blood_pressure ? ` · BP ${v.blood_pressure}` : ""}
                      </span>
                      {v.chief_complaint && (
                        <p className="mt-1 max-w-xl text-sm text-ink-soft">
                          {v.chief_complaint}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-ink-soft">
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
        <section className="border border-line bg-paper px-8 py-7 rounded-card">
          <h2 className="font-serif text-lg">Completed today</h2>
          <ul className="mt-4 divide-y divide-line">
            {finished.map((v) => {
              const p = Array.isArray(v.patients) ? v.patients[0] : v.patients;
              return (
                <li key={v.id} className="flex items-baseline justify-between gap-2 py-3">
                  <Link
                    href={`/super-admin/doctor/${v.id}`}
                    className="text-sm text-ink hover:opacity-75"
                  >
                    {p?.full_name ?? "—"}
                    <span className="ml-3 text-xs text-ink-soft">{v.visit_code}</span>
                  </Link>
                  <span className="text-xs text-ink-soft">
                    {v.completed_at ? formatClinicTime(v.completed_at) : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
