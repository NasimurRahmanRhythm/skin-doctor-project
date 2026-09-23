import { redirect } from "next/navigation";
import { requireStaff, ROLE_HOME } from "@/lib/auth";

/** Entry point: work out who this is and send them to their own desk. */
export default async function SuperAdminIndex() {
  const staff = await requireStaff();
  redirect(ROLE_HOME[staff.role]);
}
