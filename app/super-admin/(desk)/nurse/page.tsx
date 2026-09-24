import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";

export default async function NurseQueuePage({
  searchParams,
}: PageProps<"/super-admin/nurse">) {
  await requireRole("nurse");
  const sp = await searchParams;
  const supabase = await createClient();

  // RLS shows the nurse anything awaiting vitals, plus what they already took.
  const { data: waiting } = await supabase
    .from("visits")
    .select(
      "id, visit_code, visit_type, chief_complaint, created_at, patients(full_name, patient_code, age, phone)",
    )
    .eq("status", "awaiting_vitals")
    .order("created_at", { ascending: true });

  const queue = waiting ?? [];

  return (
    <div className="space-y-6">
      {sp.done === "1" && (
        <p className="border border-sage bg-ivory-dim px-5 py-3 text-sm text-sage-deep rounded-card">
          Vitals saved — the patient is now with their doctor.
        </p>
      )}

      <section className="border border-line bg-paper px-8 py-7 rounded-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-xl">Awaiting vitals</h1>
          <span className="text-sm text-ink-soft">
            {queue.length} waiting
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Oldest first. New check-ins appear here on their own.
        </p>

        {queue.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">
            Nobody is waiting on vitals right now.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line">
            {queue.map((v) => {
              const p = Array.isArray(v.patients) ? v.patients[0] : v.patients;
              return (
                <li key={v.id} className="py-4">
                  <Link
                    href={`/super-admin/nurse/${v.id}`}
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
                      </span>
                      {v.chief_complaint && (
                        <p className="mt-1 max-w-xl text-sm text-ink-soft">
                          {v.chief_complaint}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-ink-soft">
                      waiting since {formatClinicTime(v.created_at)}
                    </span>
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
