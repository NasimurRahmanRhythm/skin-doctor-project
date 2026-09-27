import PatientHistory from "@/components/patient-history";
import { requireRole } from "@/lib/auth";

export default async function ReceptionPatientPage({
  params,
}: PageProps<"/super-admin/reception/patients/[patientId]">) {
  await requireRole("receptionist");
  const { patientId } = await params;
  return <PatientHistory patientId={patientId} backHref="/super-admin/reception" />;
}
