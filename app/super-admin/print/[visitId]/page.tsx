import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { formatClinicDate, formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import PrintTrigger from "./print-trigger";

/**
 * One print renderer, four cumulative scopes. Each stage includes everything
 * from the stages before it, so the sheet a doctor hands over carries the
 * reception details and the vitals too.
 */
const SCOPES = ["reception", "nurse", "doctor", "full"] as const;
type Scope = (typeof SCOPES)[number];

const INCLUDES: Record<Scope, { vitals: boolean; clinical: boolean; timeline: boolean }> = {
  reception: { vitals: false, clinical: false, timeline: false },
  nurse: { vitals: true, clinical: false, timeline: false },
  doctor: { vitals: true, clinical: true, timeline: false },
  full: { vitals: true, clinical: true, timeline: true },
};

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="block text-[10px] uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      <strong className="text-sm font-medium">{value || "—"}</strong>
    </div>
  );
}

export default async function PrintPage({
  params,
  searchParams,
}: PageProps<"/super-admin/print/[visitId]">) {
  await requireStaff();
  const { visitId } = await params;
  const sp = await searchParams;

  const requested = Array.isArray(sp.scope) ? sp.scope[0] : sp.scope;
  const scope: Scope = SCOPES.includes(requested as Scope)
    ? (requested as Scope)
    : "reception";
  const show = INCLUDES[scope];

  const supabase = await createClient();

  // RLS decides what comes back. A doctor printing someone else's visit gets
  // nothing here, which is the same answer they get everywhere else.
  const { data: visit } = await supabase
    .from("visits")
    .select(
      `id, visit_code, status, visit_type, chief_complaint, created_at,
       doctor_id, nurse_id,
       height_cm, weight_kg, blood_pressure, blood_sugar, temperature, pulse, nurse_notes,
       diagnosis, prescription, advice, follow_up_date,
       patients(full_name, patient_code, phone, age, gender, address)`,
    )
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) notFound();

  const one = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;
  const patient = one(visit.patients) as {
    full_name: string;
    patient_code: string;
    phone: string;
    age: number | null;
    gender: string | null;
    address: string | null;
  } | null;

  // Staff names come from the directory view, not by embedding public.staff.
  // Only the owner can read that table, so embedding it left the doctor line
  // blank on every slip the front desk printed.
  const staffIds = [visit.doctor_id, visit.nurse_id].filter(Boolean) as string[];
  const { data: staffRows } = staffIds.length
    ? await supabase
        .from("staff_directory")
        .select("id, full_name, specialty")
        .in("id", staffIds)
    : { data: [] };

  const byId = new Map((staffRows ?? []).map((r) => [r.id, r]));
  const doctor = visit.doctor_id ? byId.get(visit.doctor_id) ?? null : null;
  const nurse = visit.nurse_id ? byId.get(visit.nurse_id) ?? null : null;

  let entries: { id: string; type: string; title: string; body: string | null; created_at: string }[] = [];
  if (show.timeline) {
    const { data } = await supabase
      .from("visit_entries")
      .select("id, type, title, body, created_at")
      .eq("visit_id", visitId)
      .order("created_at");
    entries = data ?? [];
  }

  return (
    <main className="mx-auto max-w-3xl px-10 py-10 text-ink">
      <PrintTrigger />

      <header className="flex items-end justify-between border-b-2 border-sage pb-4">
        <div className="font-serif text-2xl">
          Lum<em className="italic text-rose">e</em>n &amp; Leaf
        </div>
        <div className="text-right text-xs text-ink-soft">
          Skin &amp; Body Studio
          <br />
          {formatClinicDate(visit.created_at)}
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Row label="Visit code" value={visit.visit_code} />
        <Row label="Patient code" value={patient?.patient_code ?? null} />
        <Row label="Checked in" value={formatClinicTime(visit.created_at)} />
        <Row label="Patient" value={patient?.full_name ?? null} />
        <Row label="Age" value={patient?.age != null ? String(patient.age) : null} />
        <Row label="Phone" value={patient?.phone ?? null} />
        <Row label="Visit type" value={visit.visit_type} />
        <Row
          label="Doctor"
          value={doctor ? `${doctor.full_name}${doctor.specialty ? ` — ${doctor.specialty}` : ""}` : null}
        />
        {show.vitals && <Row label="Nurse" value={nurse?.full_name ?? null} />}
      </section>

      {visit.chief_complaint && (
        <section className="mt-6 border-t border-line pt-4">
          <h2 className="text-[10px] uppercase tracking-wider text-rose">
            Reason for visit
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{visit.chief_complaint}</p>
        </section>
      )}

      {show.vitals && (
        <section className="mt-6 grid grid-cols-3 gap-4 border-y border-line py-4 sm:grid-cols-6">
          <Row label="Height" value={visit.height_cm ? `${visit.height_cm} cm` : null} />
          <Row label="Weight" value={visit.weight_kg ? `${visit.weight_kg} kg` : null} />
          <Row label="BP" value={visit.blood_pressure} />
          <Row label="Sugar" value={visit.blood_sugar ? `${visit.blood_sugar} mg/dL` : null} />
          <Row label="Temp" value={visit.temperature ? `${visit.temperature} °C` : null} />
          <Row label="Pulse" value={visit.pulse ? `${visit.pulse} bpm` : null} />
        </section>
      )}

      {show.vitals && visit.nurse_notes && (
        <section className="mt-5">
          <h2 className="text-[10px] uppercase tracking-wider text-rose">Nurse notes</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{visit.nurse_notes}</p>
        </section>
      )}

      {show.clinical && (
        <section className="mt-6 space-y-5">
          {visit.diagnosis && (
            <div>
              <h2 className="text-[10px] uppercase tracking-wider text-rose">Diagnosis</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm">{visit.diagnosis}</p>
            </div>
          )}
          {visit.prescription && (
            <div>
              <h2 className="text-[10px] uppercase tracking-wider text-rose">Prescription</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{visit.prescription}</p>
            </div>
          )}
          {visit.advice && (
            <div>
              <h2 className="text-[10px] uppercase tracking-wider text-rose">Advice</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm">{visit.advice}</p>
            </div>
          )}
          {visit.follow_up_date && (
            <Row label="Follow-up" value={formatClinicDate(visit.follow_up_date)} />
          )}
        </section>
      )}

      {show.timeline && entries.length > 0 && (
        <section className="mt-6 border-t border-line pt-4">
          <h2 className="text-[10px] uppercase tracking-wider text-rose">History</h2>
          <div className="mt-3 space-y-4">
            {entries.map((e) => (
              <div key={e.id} className="break-inside-avoid">
                <div className="font-serif italic text-sage">{e.title}</div>
                <div className="text-[11px] text-ink-soft">
                  {e.type} · {formatClinicDate(e.created_at)}
                </div>
                {e.body && <p className="mt-1 whitespace-pre-wrap text-sm">{e.body}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-16 flex items-end justify-between text-xs text-ink-soft">
        <div>Lumen &amp; Leaf Skin &amp; Body Studio</div>
        {show.clinical && (
          <div className="w-52 border-t border-ink pt-1 text-center">
            Doctor&rsquo;s signature
          </div>
        )}
      </footer>
    </main>
  );
}
