import PatientHistory from "@/components/patient-history";
import { requireRole } from "@/lib/auth";

export default async function OwnerPatientPage({
  params,
}: PageProps<"/super-admin/owner/patients/[patientId]">) {
  await requireRole("owner");
  const { patientId } = await params;
  return <PatientHistory patientId={patientId} backHref="/super-admin/owner" />;
}
