import type { Metadata } from "next";
import PageShell from "@/components/site/PageShell";
import { DoctorCatalog } from "@/components/site/sections/Team";
import { getDoctors } from "@/lib/site/data";

export const metadata: Metadata = {
  title: "Our Doctors — DermaSoul Aesthetics",
  description: "The doctors of DermaSoul Aesthetics, Banani, Dhaka.",
};

/** Rebuilt whenever the owner changes a doctor; hourly at the latest. */
export const revalidate = 3600;

export default async function DoctorsPage() {
  const doctors = await getDoctors();
  return (
    <PageShell>
      <DoctorCatalog doctors={doctors} />
    </PageShell>
  );
}
