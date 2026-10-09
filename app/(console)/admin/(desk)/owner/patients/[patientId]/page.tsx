import PatientHistory from "@/components/patient-history";
import { requireRole } from "@/lib/auth";

export default async function OwnerPatientPage({
  params,
}: PageProps<"/admin/owner/patients/[patientId]">) {
  await requireRole("owner");
  const { patientId } = await params;
  return <PatientHistory patientId={patientId} backHref="/admin/owner" />;
}
