import { requireRole } from "@/lib/auth";
import PaymentSlip from "./payment-slip";

export const metadata = { title: "Payment slip" };

export default async function PaymentSlipPage() {
  await requireRole("receptionist");
  return <PaymentSlip />;
}
