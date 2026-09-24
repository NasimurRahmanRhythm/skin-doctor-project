import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { clinicDayRange, clinicToday, formatClinicDate, formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  awaiting_vitals: "With nurse",
  awaiting_doctor: "With doctor",
  completed: "Completed",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-ivory-dim px-5 py-4 rounded-card">
      <span className="block text-[11px] uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      <span className="font-serif text-xl">{value}</span>
    </div>
  );
}

const field =
  "w-full border border-line bg-ivory px-4 py-2.5 text-sm text-ink outline-none focus:outline-2 focus:outline-sage rounded-card";

export default async function OwnerPage({
  searchParams,
}: PageProps<"/super-admin/owner">) {
  await requireRole("owner");
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  const supabase = await createClient();
  const today = clinicDayRange();

  // ---- today's snapshot -------------------------------------------------
  const [{ data: todayVisits }, { data: doctors }] = await Promise.all([
    supabase
      .from("visits")
      .select("status, doctor_id")
      .gte("created_at", today.start)
      .lt("created_at", today.end),
    supabase
      .from("staff_directory")
      .select("id, full_name")
      .eq("role", "doctor")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const counts = { awaiting_vitals: 0, awaiting_doctor: 0, completed: 0 };
  const perDoctor = new Map<string, number>();
  for (const v of todayVisits ?? []) {
    counts[v.status as keyof typeof counts]++;
    if (v.doctor_id) perDoctor.set(v.doctor_id, (perDoctor.get(v.doctor_id) ?? 0) + 1);
  }

  // ---- search ------------------------------------------------------------
  let query = supabase
    .from("visits")
    .select(
      `id, visit_code, status, visit_type, doctor_requested, created_at, patient_id,
       patients(full_name, patient_code, phone),
       receptionist:receptionist_id(full_name),
       nurse:nurse_id(full_name),
       doctor:doctor_id(full_name)`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (from) query = query.gte("created_at", clinicDayRange(from).start);
  if (to) query = query.lt("created_at", clinicDayRange(to).end);

  if (q) {
    // Name, patient code and phone live on patients, so resolve those to ids
    // first and then match either the visit code or one of those patients.
    const { data: matched } = await supabase
      .from("patients")
      .select("id")
      .or(`full_name.ilike.%${q}%,patient_code.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(200);

    const ids = (matched ?? []).map((p) => p.id);
    query = ids.length
      ? query.or(`visit_code.ilike.%${q}%,patient_id.in.(${ids.join(",")})`)
      : query.ilike("visit_code", `%${q}%`);
  }

  const { data: results } = await query;
  const rows = results ?? [];
  const searching = Boolean(q || from || to);

  return (
    <div className="space-y-6">
      <section className="border border-line bg-paper px-8 py-7 rounded-card">
        <h1 className="font-serif text-xl">Today — {formatClinicDate(today.start)}</h1>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <Stat label="Checked in" value={(todayVisits ?? []).length} />
          <Stat label="With nurse" value={counts.awaiting_vitals} />
          <Stat label="With doctor" value={counts.awaiting_doctor} />
          <Stat label="Completed" value={counts.completed} />
        </div>

        {(doctors ?? []).length > 0 && (
          <div className="mt-5">
            <span className="block text-[11px] uppercase tracking-wider text-rose">
              Load per doctor today
            </span>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              {(doctors ?? []).map((d) => (
                <li key={d.id} className="text-sm text-ink-soft">
                  {d.full_name}{" "}
                  <span className="text-ink">{perDoctor.get(d.id) ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          href="/super-admin/owner/staff"
          className="mt-6 inline-block text-sm text-sage underline underline-offset-2"
        >
          Manage staff →
        </Link>
      </section>

      <section className="border border-line bg-paper px-8 py-7 rounded-card">
        <h2 className="font-serif text-lg">Find a patient</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Search by visit code, patient code, name or phone. Narrow it with a
          date range.
        </p>

        <form className="mt-5 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            name="q"
            defaultValue={q}
            placeholder="LL-260924-001, LL-P-00007, Farhana, 01711…"
            className={field}
          />
          <input
            type="date"
            name="from"
            defaultValue={from}
            max={clinicToday()}
            className={field}
            aria-label="From date"
          />
          <input
            type="date"
            name="to"
            defaultValue={to}
            max={clinicToday()}
            className={field}
            aria-label="To date"
          />
          <button
            type="submit"
            className="border border-sage bg-sage px-6 py-2.5 text-sm font-medium text-paper hover:bg-sage-deep rounded-card"
          >
            Search
          </button>
        </form>

        {searching && (
          <Link
            href="/super-admin/owner"
            className="mt-3 inline-block text-xs text-sage underline"
          >
            Clear
          </Link>
        )}

        <p className="mt-5 text-xs text-ink-soft">
          {searching
            ? `${rows.length} matching ${rows.length === 1 ? "visit" : "visits"}`
            : `${rows.length} most recent ${rows.length === 1 ? "visit" : "visits"}`}
        </p>

        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">Nothing matches that.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-soft">
                  <th className="py-2 pr-4 font-normal">Patient</th>
                  <th className="py-2 pr-4 font-normal">Visit</th>
                  <th className="py-2 pr-4 font-normal">Reception</th>
                  <th className="py-2 pr-4 font-normal">Nurse</th>
                  <th className="py-2 pr-4 font-normal">Doctor</th>
                  <th className="py-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => {
                  const one = <T,>(x: T | T[] | null) =>
                    Array.isArray(x) ? (x[0] ?? null) : x;
                  const p = one(v.patients) as {
                    full_name: string;
                    patient_code: string;
                    phone: string;
                  } | null;
                  const rec = one(v.receptionist) as { full_name: string } | null;
                  const nur = one(v.nurse) as { full_name: string } | null;
                  const doc = one(v.doctor) as { full_name: string } | null;

                  return (
                    <tr key={v.id} className="border-b border-line align-top">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/super-admin/owner/patients/${v.patient_id}`}
                          className="text-ink hover:underline"
                        >
                          {p?.full_name ?? "—"}
                        </Link>
                        <span className="block text-xs text-ink-soft">
                          {p?.patient_code} · {p?.phone}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {v.visit_code}
                        <span className="block text-xs text-ink-soft">
                          {formatClinicDate(v.created_at)}{" "}
                          {formatClinicTime(v.created_at)} · {v.visit_type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{rec?.full_name ?? "—"}</td>
                      <td className="py-3 pr-4 text-ink-soft">{nur?.full_name ?? "—"}</td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {doc?.full_name ?? "—"}
                        <span className="block text-[11px]">
                          {v.doctor_requested ? "requested" : "auto"}
                        </span>
                      </td>
                      <td className="py-3 text-ink-soft">
                        {STATUS_LABEL[v.status] ?? v.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
