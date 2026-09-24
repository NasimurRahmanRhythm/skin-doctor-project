import Link from "next/link";
import { notFound } from "next/navigation";
import VisitSummary from "@/components/visit-summary";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markVisitRead } from "../../notification-actions";
import VitalsForm from "./vitals-form";

export default async function NurseVisitPage({
  params,
}: PageProps<"/super-admin/nurse/[visitId]">) {
  await requireRole("nurse");
  const { visitId } = await params;
  const supabase = await createClient();

  const { data: visit } = await supabase
    .from("visits")
    .select(
      `id, visit_code, visit_type, chief_complaint, created_at, status,
       doctor_id, receptionist_id,
       patients(full_name, patient_code, phone, age, gender)`,
    )
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) notFound();

  // Names come from the directory view — public.staff is owner-only, so
  // embedding it here would leave every line blank.
  const staffIds = [visit.doctor_id, visit.receptionist_id].filter(
    Boolean,
  ) as string[];
  const { data: staffRows } = staffIds.length
    ? await supabase
        .from("staff_directory")
        .select("id, full_name, specialty")
        .in("id", staffIds)
    : { data: [] };

  const byId = new Map((staffRows ?? []).map((s) => [s.id, s]));
  const doctor = visit.doctor_id ? byId.get(visit.doctor_id) ?? null : null;
  const receptionist = visit.receptionist_id
    ? byId.get(visit.receptionist_id) ?? null
    : null;

  // Opening the patient is the moment the alert stops being useful.
  await markVisitRead(visitId);

  const patient = Array.isArray(visit.patients) ? visit.patients[0] : visit.patients;
  const alreadyDone = visit.status !== "awaiting_vitals";

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link href="/super-admin/nurse" className="text-sm font-bold text-primary underline-offset-4 transition-ui hover:underline">
          ← Back to queue
        </Link>
        <Link
          href={`/super-admin/print/${visit.id}?scope=nurse`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-control border border-hairline bg-surface px-4 py-2 text-xs font-bold text-fg transition-ui hover:border-primary hover:bg-primary-soft hover:text-primary"
        >
          Print
        </Link>
      </div>

      <VisitSummary
        visit={{
          visit_code: visit.visit_code,
          visit_type: visit.visit_type,
          chief_complaint: visit.chief_complaint,
          created_at: visit.created_at,
          patient: patient ?? null,
          receptionistName: receptionist?.full_name ?? null,
          doctorName: doctor?.full_name ?? null,
        }}
      />

      {alreadyDone ? (
        <p className="border border-hairline bg-surface px-8 py-7 text-sm text-muted rounded-card">
          Vitals for this visit have already been recorded and the patient has
          moved on to the doctor.
        </p>
      ) : (
        <VitalsForm visitId={visit.id} />
      )}
    </div>
  );
}
