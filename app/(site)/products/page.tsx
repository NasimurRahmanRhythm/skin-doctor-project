import type { Metadata } from "next";
import PageShell from "@/components/site/PageShell";
import { ProductCatalog } from "@/components/site/sections/Shop";
import { getProducts } from "@/lib/site/data";

export const metadata: Metadata = {
  title: "Shop — DermaSoul Aesthetics",
  description: "Practitioner-selected skincare from DermaSoul Aesthetics, Banani, Dhaka.",
};

/** Rebuilt whenever the owner saves a product; hourly at the latest. */
export const revalidate = 3600;

export default async function ProductsPage() {
  const items = await getProducts();
  return (
    <PageShell>
      <ProductCatalog items={items} />
    </PageShell>
  );
}
