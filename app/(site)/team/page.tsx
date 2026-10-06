import type { Metadata } from "next";
import PageShell from "@/components/site/PageShell";
import { TeamCatalog } from "@/components/site/sections/Team";
import { getDoctors } from "@/lib/site/data";

export const metadata: Metadata = {
  title: "Our Team — DermaSoul Aesthetics",
  description: "The team of DermaSoul Aesthetics, Banani, Dhaka.",
};

/** Rebuilt whenever the owner changes a team member; hourly at the latest. */
export const revalidate = 3600;

export default async function TeamPage() {
  const doctors = await getDoctors();
  return (
    <PageShell>
      <TeamCatalog doctors={doctors} />
    </PageShell>
  );
}
