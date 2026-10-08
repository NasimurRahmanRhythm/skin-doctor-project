import type { Metadata } from "next";
import PageShell from "@/components/site/PageShell";
import { PackageCatalog } from "@/components/site/sections/Packages";
import { getPackages } from "@/lib/site/data";

export const metadata: Metadata = {
  title: "Packages — DermaSoul Medical Aesthetics",
  description: "Multi-session treatment packages at DermaSoul Medical Aesthetics, Banani, Dhaka.",
};

/** Rebuilt whenever the owner saves a package; hourly at the latest. */
export const revalidate = 3600;

export default async function PackagesPage() {
  const items = await getPackages();
  return (
    <PageShell>
      <PackageCatalog items={items} />
    </PageShell>
  );
}
