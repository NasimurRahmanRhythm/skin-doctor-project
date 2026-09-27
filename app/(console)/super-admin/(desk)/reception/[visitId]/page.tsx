import Link from "next/link";
import { notFound } from "next/navigation";
import PatientHistory from "@/components/patient-history";
import { btnPrimary, Code, StatusPill } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import { markVisitRead } from "../../notification-actions";

/**
 * Where a "visit completed" alert lands: the patient's full record, with the
 * visit the alert was about on top and its prescription one click from print.
 */
export default async function ReceptionVisitPage({
  params,
}: PageProps<"/super-admin/reception/[visitId]">) {
  await requireRole("receptionist");
  const { visitId } = await params;
  const supabase = await createClient();

  const { data: visit } = await supabase
    .from("visits")
    .select("id, visit_code, status, completed_at, patient_id, doctor_id")
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) notFound();
  await markVisitRead(visitId);

  const { data: doctor } = visit.doctor_id
    ? await supabase
        .from("staff_directory")
        .select("full_name")
        .eq("id", visit.doctor_id)
        .maybeSingle()
    : { data: null };

  return (
    <PatientHistory patientId={visit.patient_id} backHref="/super-admin/reception">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-primary/35 bg-primary/8 px-5 py-4 shadow-card sm:px-7">
        <div className="min-w-0 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Code className="font-semibold text-fg">{visit.visit_code}</Code>
            <StatusPill status={visit.status} />
          </div>
          <p className="mt-1.5 text-muted">
            {visit.status === "completed"
              ? `Completed${doctor ? ` by ${doctor.full_name}` : ""}${
                  visit.completed_at ? ` at ${formatClinicTime(visit.completed_at)}` : ""
                }.`
              : "This visit is still in progress."}
          </p>
        </div>
        <Link
          href={`/super-admin/print/${visit.id}`}
          target="_blank"
          className={`${btnPrimary} no-print`}
        >
          Print prescription
        </Link>
      </section>
    </PatientHistory>
  );
}
