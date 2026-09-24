import Link from "next/link";
import {
  btnQuiet,
  card,
  cardPad,
  Person,
  SectionHead,
  tableEl,
  tableWrap,
  tdCell,
  thCell,
  trRow,
} from "@/components/ui";
import { requireRole, ROLE_LABEL, type AppRole } from "@/lib/auth";
import { clinicDayRange } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import { setStaffActive } from "../actions";
import AddStaffForm from "./add-staff-form";

/** Same tiles as the dashboard, so the two owner pages read as one place. */
function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
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

const ROLE_TONE: Record<string, string> = {
  owner: "border-hairline bg-subtle text-muted",
  receptionist: "border-accent/35 bg-accent-soft text-accent",
  nurse: "border-warn/35 bg-warn/12 text-warn",
  doctor: "border-primary/35 bg-primary-soft text-primary",
};

function RolePill({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        ROLE_TONE[role] ?? "border-hairline bg-subtle text-muted"
      }`}
    >
      {ROLE_LABEL[role as AppRole] ?? role}
    </span>
  );
}

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

  // Only active people are counted. A deactivated doctor cannot sign in and
  // receives no new patients, so counting them would overstate the cover the
  // clinic actually has tomorrow morning.
  const byRole = { doctor: 0, nurse: 0, receptionist: 0 };
  for (const s of active) {
    if (s.role in byRole) byRole[s.role as keyof typeof byRole]++;
  }

  return (
    <div className="space-y-6">
      <section className="hero animate-rise relative overflow-hidden rounded-card px-6 py-7 shadow-lift sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-hero-fg/60">
              Staff
            </p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-[28px]">Your team</h1>
            <p className="mt-1 text-sm text-hero-fg/75">
              {active.length} active · {inactive.length} deactivated
            </p>
          </div>

          <Link
            href="/super-admin/owner"
            className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
          >
            <span aria-hidden="true">←</span>
            Back to dashboard
          </Link>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Stat label="Doctors" value={byRole.doctor} dot="bg-teal-300" />
          <Stat label="Nurses" value={byRole.nurse} dot="bg-amber-300" />
          <Stat
            label="Receptionists"
            value={byRole.receptionist}
            dot="bg-orange-300"
          />
        </div>
      </section>

      <section className={`${card} ${cardPad}`}>
        <SectionHead
          title="Team members"
          hint="Deactivating blocks sign-in immediately but keeps their name on every past visit, so the record of who treated whom stays intact."
        />

        <div className={`mt-5 ${tableWrap}`}>
          <table className={`${tableEl} min-w-[720px]`}>
            <thead>
              <tr>
                <th className={`${thCell} rounded-tl-card`}>Name</th>
                <th className={thCell}>Role</th>
                <th className={thCell}>Email</th>
                <th className={thCell}>Patients today</th>
                <th className={`${thCell} rounded-tr-card text-right`}>Access</th>
              </tr>
            </thead>
            <tbody>
              {(team ?? []).map((s) => (
                <tr
                  key={s.id}
                  className={`${trRow} ${s.is_active ? "" : "opacity-55"}`}
                >
                  <td className={tdCell}>
                    <Person
                      name={s.full_name}
                      role={
                        s.role === "owner"
                          ? undefined
                          : (s.role as "receptionist" | "nurse" | "doctor")
                      }
                    />
                    <span className="mt-0.5 block pl-8 text-xs text-muted">
                      {s.id === owner.id && (
                        <span className="font-bold text-primary">you</span>
                      )}
                      {s.id === owner.id && s.specialty && " · "}
                      {s.specialty}
                    </span>
                  </td>
                  <td className={tdCell}>
                    <RolePill role={s.role} />
                  </td>
                  <td className={`${tdCell} text-muted`}>{s.email}</td>
                  <td className={`${tdCell} font-bold tabular`}>
                    {handled.get(s.id) ?? 0}
                  </td>
                  <td className={`${tdCell} text-right`}>
                    {s.id === owner.id ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <form action={setStaffActive}>
                        <input type="hidden" name="staff_id" value={s.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={s.is_active ? "0" : "1"}
                        />
                        <button
                          type="submit"
                          className={`${btnQuiet} ${
                            s.is_active ? "hover:text-danger" : "hover:text-ok"
                          }`}
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

        <p className="mt-5 text-xs text-muted">
          A deactivated doctor also stops receiving new patients.
        </p>
      </section>

      <AddStaffForm />
    </div>
  );
}
