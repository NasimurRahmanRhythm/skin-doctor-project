import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/site/PageShell";
import TreatmentDetail from "@/components/site/sections/TreatmentDetail";
import { getTreatment } from "@/lib/site/data";
import { excerpt } from "@/lib/site/excerpt";

/** Rebuilt whenever the owner saves a treatment; hourly at the latest. */
export const revalidate = 3600;

/** None at build time: each page is made on its first visit, then cached. */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/treatments/[slug]">): Promise<Metadata> {
  const found = await getTreatment((await params).slug);
  if (!found) return { title: "Treatment — DermaSoul Aesthetics" };
  const { treatment: t } = found;
  return {
    title: `${t.title} — DermaSoul Aesthetics`,
    description: excerpt(t.description ?? t.subtitle ?? `${t.title} at DermaSoul Aesthetics, Banani, Dhaka.`),
    openGraph: t.image ? { images: [t.image] } : undefined,
  };
}

/** One treatment's page, laid out like athenaderma.com's (/microneedling…). */
export default async function TreatmentPage({ params }: PageProps<"/treatments/[slug]">) {
  const found = await getTreatment((await params).slug);
  if (!found) notFound();
  return (
    <PageShell>
      <TreatmentDetail treatment={found.treatment} similar={found.similar} />
    </PageShell>
  );
}
