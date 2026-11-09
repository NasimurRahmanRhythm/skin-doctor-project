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
import { publicImageUrl } from "@/lib/site-media";
import { createClient } from "@/lib/supabase/server";
import {
  moveDoctor,
  setStaffActive,
  setStaffDesignation,
  setStaffOnWebsite,
  setStaffTag,
  setStaffVisitFee,
} from "../actions";
import AddStaffForm from "./add-staff-form";
import DesignationsCard from "./designations-card";
import StaffPhotoForm from "./staff-photo-form";

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
  call_center: "border-ok/35 bg-ok/10 text-ok",
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
  const staffColumns =
    "id, email, full_name, role, specialty, is_active, created_at, photo_path, show_on_website";
  const readTeam = (columns: string) =>
    supabase.from("staff").select(columns).order("role").order("full_name");
  const [teamResult, { data: todayVisits }, { data: designationRows }, orderResult, tagResult] = await Promise.all([
    readTeam(`${staffColumns}, visit_fee`),
    supabase
      .from("visits")
      .select("receptionist_id, nurse_id, doctor_id")
      .gte("created_at", start),
    supabase.from("designations").select("id, name").order("name"),
    // Errors until migration 20261101000026 adds website_order.
    supabase.from("staff").select("id, website_order").eq("role", "doctor"),
    // Errors until migration 20261107000027 adds tag.
    supabase.from("staff").select("id, tag").eq("role", "doctor"),
  ]);
  const designations = designationRows ?? [];

  type Member = {
    id: string;
    email: string;
    full_name: string;
    role: string;
    specialty: string | null;
    is_active: boolean;
    photo_path: string | null;
    show_on_website: boolean;
    visit_fee?: number | null;
    created_at: string;
  };
  // Until migration 20261031000025 adds visit_fee, read the team without it.
  let team = teamResult.data as unknown as Member[] | null;
  const hasVisitFee = !teamResult.error;
  if (teamResult.error) {
    team = (await readTeam(staffColumns)).data as unknown as Member[] | null;
  }

  // How many patients each person has touched today — the reason the owner
  // opens this page is usually to see who is carrying the load.
  const handled = new Map<string, number>();
  for (const v of todayVisits ?? []) {
    for (const id of [v.receptionist_id, v.nurse_id, v.doctor_id]) {
      if (id) handled.set(id, (handled.get(id) ?? 0) + 1);
    }
  }

  // The doctors the website shows, in the order it shows them: the first four
  // are the landing page's Our Team.
  const orderOf = new Map(
    (orderResult.data ?? []).map((r) => [r.id as string, r.website_order as number | null]),
  );
  const hasTag = !tagResult.error;
  const tagOf = new Map(
    (tagResult.data ?? []).map((r) => [r.id as string, (r.tag as string | null) ?? ""]),
  );
  const onWebsite = (team ?? [])
    .filter((s) => s.role === "doctor" && s.is_active && s.show_on_website)
    .sort(
      (a, b) =>
        (orderOf.get(a.id) ?? Infinity) - (orderOf.get(b.id) ?? Infinity) ||
        a.created_at.localeCompare(b.created_at),
    );

  const active = (team ?? []).filter((s) => s.is_active);
  const inactive = (team ?? []).filter((s) => !s.is_active);

  // Only active people are counted. A deactivated doctor cannot sign in and
  // receives no new patients, so counting them would overstate the cover the
  // clinic actually has tomorrow morning.
  const byRole = { doctor: 0, nurse: 0, receptionist: 0, call_center: 0 };
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
            href="/admin/owner"
            className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
          >
            <span aria-hidden="true">←</span>
            Back to dashboard
          </Link>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Doctors" value={byRole.doctor} dot="bg-sky-300" />
          <Stat label="Nurses" value={byRole.nurse} dot="bg-amber-300" />
          <Stat
            label="Receptionists"
            value={byRole.receptionist}
            dot="bg-orange-300"
          />
          <Stat label="Call center" value={byRole.call_center} dot="bg-emerald-300" />
        </div>
      </section>

      <section className={`${card} ${cardPad}`}>
        <SectionHead
          title="Team members"
          hint="Deactivating blocks sign-in immediately but keeps their name on every past visit, so the record of who treated whom stays intact."
        />

        <div className={`mt-5 ${tableWrap}`}>
          <table className={`${tableEl} min-w-[880px]`}>
            <thead>
              <tr>
                <th className={`${thCell} rounded-tl-card`}>Name</th>
                <th className={thCell}>Role</th>
                <th className={thCell}>Email</th>
                <th className={thCell}>Patients today</th>
                <th className={thCell}>Website</th>
                <th className={`${thCell} rounded-tr-card text-right`}>Manage</th>
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
                      photoUrl={publicImageUrl("staff-photos", s.photo_path)}
                      role={
                        s.role === "owner" || s.role === "call_center"
                          ? undefined
                          : (s.role as "receptionist" | "nurse" | "doctor")
                      }
                    />
                    <span className="mt-0.5 block pl-8 text-xs text-muted">
                      {s.id === owner.id && (
                        <span className="font-bold text-primary">you</span>
                      )}
                      {s.id === owner.id && s.specialty && " · "}
                      {s.role === "doctor" && designations.length > 0 ? (
                        <form action={setStaffDesignation} className="inline-flex items-center gap-1">
                          <input type="hidden" name="staff_id" value={s.id} />
                          <select
                            name="specialty"
                            defaultValue={s.specialty ?? ""}
                            aria-label={`Designation of ${s.full_name}`}
                            className="max-w-48 rounded-md border border-transparent bg-transparent py-0.5 text-xs text-muted transition-ui hover:border-hairline focus:border-primary focus:outline-none"
                          >
                            {!s.specialty && <option value="">No designation</option>}
                            {/* A designation since removed from the list is still theirs. */}
                            {s.specialty && !designations.some((d) => d.name === s.specialty) && (
                              <option value={s.specialty}>{s.specialty}</option>
                            )}
                            {designations.map((d) => (
                              <option key={d.id} value={d.name}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="text-[11px] font-bold text-primary underline-offset-2 hover:underline"
                          >
                            Save
                          </button>
                        </form>
                      ) : (
                        s.specialty
                      )}
                    </span>
                    {s.role === "doctor" && hasTag && (
                      <form
                        action={setStaffTag}
                        className="mt-1 flex items-center gap-1 pl-8 text-xs text-muted"
                      >
                        <input type="hidden" name="staff_id" value={s.id} />
                        <label htmlFor={`tag-${s.id}`}>Tag</label>
                        <input
                          id={`tag-${s.id}`}
                          name="tag"
                          maxLength={80}
                          defaultValue={tagOf.get(s.id) ?? ""}
                          placeholder="—"
                          className="w-40 rounded-md border border-hairline bg-transparent px-1.5 py-0.5 text-xs text-fg focus:border-primary focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="text-[11px] font-bold text-primary underline-offset-2 hover:underline"
                        >
                          Save
                        </button>
                      </form>
                    )}
                    {s.role === "doctor" && hasVisitFee && (
                      <form
                        action={setStaffVisitFee}
                        className="mt-1 flex items-center gap-1 pl-8 text-xs text-muted"
                      >
                        <input type="hidden" name="staff_id" value={s.id} />
                        <label htmlFor={`fee-${s.id}`}>Visit price ৳</label>
                        <input
                          id={`fee-${s.id}`}
                          name="visit_fee"
                          inputMode="numeric"
                          pattern="[0-9,]*"
                          defaultValue={s.visit_fee ?? ""}
                          placeholder="—"
                          className="w-20 rounded-md border border-hairline bg-transparent px-1.5 py-0.5 text-xs text-fg focus:border-primary focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="text-[11px] font-bold text-primary underline-offset-2 hover:underline"
                        >
                          Save
                        </button>
                      </form>
                    )}
                  </td>
                  <td className={tdCell}>
                    <RolePill role={s.role} />
                  </td>
                  <td className={`${tdCell} text-muted`}>{s.email}</td>
                  <td className={`${tdCell} font-bold tabular`}>
                    {handled.get(s.id) ?? 0}
                  </td>
                  <td className={tdCell}>
                    {s.role === "doctor" ? (
                      <form action={setStaffOnWebsite}>
                        <input type="hidden" name="staff_id" value={s.id} />
                        <input type="hidden" name="show" value={s.show_on_website ? "0" : "1"} />
                        <button
                          type="submit"
                          title={
                            s.show_on_website
                              ? "Shown in the Doctors section of the website. Click to hide."
                              : "Hidden from the website. Click to show."
                          }
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold transition-ui ${
                            s.show_on_website
                              ? "border-ok/40 bg-ok/10 text-ok hover:border-ok"
                              : "border-hairline bg-subtle text-muted hover:text-fg"
                          }`}
                        >
                          {s.show_on_website ? "Shown" : "Hidden"}
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className={`${tdCell} text-right`}>
                    <div className="flex items-center justify-end gap-3">
                      <StaffPhotoForm
                        staffId={s.id}
                        name={s.full_name}
                        photoUrl={publicImageUrl("staff-photos", s.photo_path)}
                      />
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
                    </div>
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

      <section className={`${card} ${cardPad}`}>
        <SectionHead
          title="Doctors on the website"
          hint="Move a doctor up or down to set the order. The top 4 show on the landing page; the All doctors page lists everyone in this order. Show or hide a doctor in the Website column above."
        />
        {orderResult.error ? (
          <p className="mt-5 rounded-control border border-dashed border-hairline px-3 py-2.5 text-sm text-muted">
            Run the doctor-order migration (20261101000026) in Supabase to set the order.
          </p>
        ) : onWebsite.length === 0 ? (
          <p className="mt-5 text-sm text-muted">No doctor is shown on the website yet.</p>
        ) : (
          <ol className="mt-5 divide-y divide-hairline rounded-control border border-hairline">
            {onWebsite.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="w-6 text-sm font-bold tabular text-muted">{i + 1}.</span>
                <span className="min-w-0 flex-1">
                  <Person
                    name={s.full_name}
                    photoUrl={publicImageUrl("staff-photos", s.photo_path)}
                    role="doctor"
                  />
                </span>
                {i < 4 && (
                  <span className="rounded-full border border-ok/40 bg-ok/10 px-2.5 py-1 text-[11px] font-bold text-ok">
                    Landing page
                  </span>
                )}
                <span className="flex items-center gap-1">
                  {(["up", "down"] as const).map((dir) => (
                    <form key={dir} action={moveDoctor}>
                      <input type="hidden" name="staff_id" value={s.id} />
                      <input type="hidden" name="dir" value={dir} />
                      <button
                        type="submit"
                        disabled={dir === "up" ? i === 0 : i === onWebsite.length - 1}
                        aria-label={`Move ${s.full_name} ${dir}`}
                        title={dir === "up" ? "Move up" : "Move down"}
                        className="grid h-7 w-7 place-items-center rounded-full text-muted transition-ui hover:bg-subtle hover:text-fg disabled:opacity-30"
                      >
                        {dir === "up" ? "↑" : "↓"}
                      </button>
                    </form>
                  ))}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <DesignationsCard designations={designations} />

      <AddStaffForm designations={designations.map((d) => d.name)} />
    </div>
  );
}
