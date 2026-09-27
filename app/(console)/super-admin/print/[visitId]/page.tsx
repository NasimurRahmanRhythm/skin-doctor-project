import { notFound } from "next/navigation";
import {
  PadPrintStyles,
  PadSection,
  PadSheet,
  ReadBullets,
  ReadInvestigations,
  ReadMedicines,
  ReadNumbered,
  RxMark,
} from "@/components/rx-pad";
import { requireStaff } from "@/lib/auth";
import {
  ageLabel,
  formatPadDate,
  PAD_COLUMNS,
  readPad,
  type PadSource,
} from "@/lib/prescription";
import { createClient } from "@/lib/supabase/server";
import PrintTrigger from "./print-trigger";

/**
 * The printed prescription pad. Every desk prints this same sheet.
 *
 * Printed by reception before the doctor has seen the patient, it is a blank
 * pad with the patient's details on it — something to write on by hand if the
 * screen is down. Printed by the nurse it also carries the vitals. Printed
 * after the consultation it is the prescription the patient takes home.
 */
export default async function PrintPage({
  params,
}: PageProps<"/super-admin/print/[visitId]">) {
  await requireStaff();
  const { visitId } = await params;

  const supabase = await createClient();

  // RLS decides what comes back. A doctor printing someone else's visit gets
  // nothing here, which is the same answer they get everywhere else.
  const { data: visit } = await supabase
    .from("visits")
    .select(
      `id, created_at, doctor_id, ${PAD_COLUMNS},
       patients(full_name, patient_code, age, date_of_birth)`,
    )
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) notFound();

  const patient = (Array.isArray(visit.patients) ? visit.patients[0] : visit.patients) as {
    full_name: string;
    patient_code: string;
    age: number | null;
    date_of_birth: string | null;
  } | null;

  // Staff names come from the directory view, not by embedding public.staff:
  // only the owner can read that table, so embedding it left the doctor's name
  // blank on every sheet the front desk printed.
  const { data: doctor } = visit.doctor_id
    ? await supabase
        .from("staff_directory")
        .select("full_name, specialty")
        .eq("id", visit.doctor_id)
        .maybeSingle()
    : { data: null };

  const pad = readPad(visit as unknown as PadSource);

  return (
    <main className="min-h-screen bg-canvas py-8 print:bg-white print:py-0">
      <PadPrintStyles />
      <PrintTrigger />

      <PadSheet
        className="mx-auto min-h-[297mm] w-full max-w-[210mm]"
        people={{
          doctor: doctor
            ? { name: doctor.full_name, specialty: doctor.specialty }
            : null,
          patient: {
            name: patient?.full_name ?? "—",
            age: patient ? ageLabel(patient) : null,
            id: patient?.patient_code ?? null,
          },
          date: formatPadDate(visit.created_at),
        }}
        left={
          <>
            <PadSection title="Chief Complaint">
              <ReadBullets items={pad.complaints} />
            </PadSection>
            <PadSection title="On Examination">
              <ReadBullets items={pad.examinations} />
            </PadSection>
            {/* Older visits were written with a free-text diagnosis. */}
            {visit.diagnosis && (
              <PadSection title="Diagnosis">
                <p className="whitespace-pre-wrap text-[13.5px]">{visit.diagnosis}</p>
              </PadSection>
            )}
            <PadSection title="Investigation">
              <ReadInvestigations items={pad.investigations} />
            </PadSection>
            <PadSection title="Advice">
              <ReadNumbered items={pad.advices} />
            </PadSection>
          </>
        }
        right={
          <PadSection title={<RxMark />}>
            {pad.medicines.length === 0 && visit.prescription ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {visit.prescription}
              </p>
            ) : (
              <ReadMedicines items={pad.medicines} />
            )}
          </PadSection>
        }
      />
    </main>
  );
}
