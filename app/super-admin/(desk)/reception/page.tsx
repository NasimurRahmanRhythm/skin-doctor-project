import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { clinicDayRange, formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import CheckInForm from "./check-in-form";

const STATUS_LABEL: Record<string, string> = {
  awaiting_vitals: "With nurse",
  awaiting_doctor: "With doctor",
  completed: "Done",
};

export default async function ReceptionPage() {
  const staff = await requireRole("receptionist");
  const supabase = await createClient();
  const { start, end } = clinicDayRange();

  const [{ data: doctors }, { data: todays }] = await Promise.all([
    supabase
      .from("staff_directory")
      .select("id, full_name, specialty")
      .eq("role", "doctor")
      .eq("is_active", true)
      .order("full_name"),
    // RLS already limits this to visits this receptionist created; the date
    // range narrows it to today so the list stays short at a busy desk.
    supabase
      .from("visits")
      .select(
        "id, visit_code, status, visit_type, created_at, patients(full_name, patient_code)",
      )
      .eq("receptionist_id", staff.id)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <CheckInForm doctors={doctors ?? []} />

      <section className="border border-line bg-paper px-8 py-7 rounded-card">
        <h2 className="font-serif text-lg">Your check-ins today</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {todays?.length
            ? "Reprint a slip or read a code back over the phone."
            : "Nothing checked in yet today."}
        </p>

        {todays && todays.length > 0 && (
          <ul className="mt-5 divide-y divide-line">
            {todays.map((v) => {
              const patient = Array.isArray(v.patients)
                ? v.patients[0]
                : v.patients;
              return (
                <li
                  key={v.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3"
                >
                  <div>
                    <span className="text-sm text-ink">
                      {patient?.full_name ?? "—"}
                    </span>
                    <span className="ml-3 text-xs text-ink-soft">
                      {v.visit_code} · {formatClinicTime(v.created_at)} ·{" "}
                      {v.visit_type}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs text-ink-soft">
                      {STATUS_LABEL[v.status] ?? v.status}
                    </span>
                    <Link
                      href={`/super-admin/print/${v.id}?scope=reception`}
                      target="_blank"
                      className="text-xs text-sage underline underline-offset-2"
                    >
                      Print
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
