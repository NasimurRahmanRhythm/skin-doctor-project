import type { Metadata } from "next";
import PageShell from "@/components/site/PageShell";
import { TreatmentCatalog } from "@/components/site/sections/Treatments";
import { getTreatments } from "@/lib/site/data";

export const metadata: Metadata = {
  title: "Treatments — DermaSoul Aesthetics",
  description: "Every treatment at DermaSoul Aesthetics, Banani, Dhaka.",
};

/** Rebuilt whenever the owner saves a treatment; hourly at the latest. */
export const revalidate = 3600;

export default async function TreatmentsPage() {
  const items = await getTreatments();
  return (
    <PageShell>
      <TreatmentCatalog items={items} />
    </PageShell>
  );
}
