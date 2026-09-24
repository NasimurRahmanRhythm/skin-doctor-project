import Link from "next/link";
import { requireRole, ROLE_LABEL, type AppRole } from "@/lib/auth";
import { clinicDayRange } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import { setStaffActive } from "../actions";
import AddStaffForm from "./add-staff-form";

export default async function StaffPage() {
  const owner = await requireRole("owner");
  const supabase = await createClient();
  const { start } = clinicDayRange();

  // The owner policy on public.staff is what makes the full rows readable here.
  const [{ data: team }, { data: todayVisits }] = await Promise.all([
    supabase
      .from("staff")
      .select("id, email, full_name, role, specialty, is_active, created_at")
      .order("role")
      .order("full_name"),
    supabase
      .from("visits")
      .select("receptionist_id, nurse_id, doctor_id")
      .gte("created_at", start),
  ]);

  // How many patients each person has touched today — the reason the owner
  // opens this page is usually to see who is carrying the load.
  const handled = new Map<string, number>();
  for (const v of todayVisits ?? []) {
    for (const id of [v.receptionist_id, v.nurse_id, v.doctor_id]) {
      if (id) handled.set(id, (handled.get(id) ?? 0) + 1);
    }
  }

  const active = (team ?? []).filter((s) => s.is_active);
  const inactive = (team ?? []).filter((s) => !s.is_active);

  return (
    <div className="space-y-6">
      <Link
        href="/super-admin/owner"
        className="inline-block text-sm text-sage underline underline-offset-2"
      >
        ← Back to dashboard
      </Link>

      <section className="border border-line bg-paper px-8 py-7 rounded-card">
        <h1 className="font-serif text-xl">Team</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {active.length} active · {inactive.length} deactivated
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="py-2 pr-4 font-normal">Name</th>
                <th className="py-2 pr-4 font-normal">Role</th>
                <th className="py-2 pr-4 font-normal">Email</th>
                <th className="py-2 pr-4 font-normal">Today</th>
                <th className="py-2 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {(team ?? []).map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-line ${s.is_active ? "" : "opacity-55"}`}
                >
                  <td className="py-3 pr-4">
                    {s.full_name}
                    {s.id === owner.id && (
                      <span className="ml-2 text-[11px] text-ink-soft">(you)</span>
                    )}
                    {s.specialty && (
                      <span className="block text-xs text-ink-soft">{s.specialty}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">
                    {ROLE_LABEL[s.role as AppRole] ?? s.role}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">{s.email}</td>
                  <td className="py-3 pr-4 text-ink-soft">{handled.get(s.id) ?? 0}</td>
                  <td className="py-3 text-right">
                    {s.id === owner.id ? (
                      <span className="text-[11px] text-ink-soft">—</span>
                    ) : (
                      <form action={setStaffActive}>
                        <input type="hidden" name="staff_id" value={s.id} />
                        <input type="hidden" name="active" value={s.is_active ? "0" : "1"} />
                        <button
                          type="submit"
                          className="text-xs text-sage underline underline-offset-2"
                        >
                          {s.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 text-xs text-ink-soft">
          Deactivating blocks sign-in immediately but keeps their name on every
          past visit, so the record of who treated whom stays intact. A
          deactivated doctor also stops receiving new patients.
        </p>
      </section>

      <AddStaffForm />
    </div>
  );
}
