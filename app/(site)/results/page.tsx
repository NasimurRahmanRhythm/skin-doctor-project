import type { Metadata } from "next";
import PageShell from "@/components/site/PageShell";
import { ResultCatalog } from "@/components/site/sections/Results";
import { getResults } from "@/lib/site/data";

export const metadata: Metadata = {
  title: "Results — DermaSoul Aesthetics",
  description: "Before and after results from DermaSoul Aesthetics, Banani, Dhaka.",
};

/** Rebuilt whenever the owner saves a result; hourly at the latest. */
export const revalidate = 3600;

export default async function ResultsPage() {
  const items = await getResults();
  return (
    <PageShell>
      <ResultCatalog items={items} />
    </PageShell>
  );
}
