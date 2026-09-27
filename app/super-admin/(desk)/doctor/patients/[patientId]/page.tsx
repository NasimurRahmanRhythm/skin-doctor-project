import PatientHistory from "@/components/patient-history";
import { requireRole } from "@/lib/auth";

export default async function DoctorPatientPage({
  params,
}: PageProps<"/super-admin/doctor/patients/[patientId]">) {
  await requireRole("doctor");
  const { patientId } = await params;
  return (
    <PatientHistory patientId={patientId} backHref="/super-admin/doctor" />
  );
}
