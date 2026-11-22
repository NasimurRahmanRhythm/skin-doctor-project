import type { Metadata } from "next";
import LegalPage from "@/components/site/LegalPage";
import { termsOfUse } from "@/lib/site/legal";

export const metadata: Metadata = {
  title: "Terms of Use — DermaSoul Medical Aesthetics",
  description: "The terms for using the DermaSoul Medical Aesthetics website.",
};

export default function TermsPage() {
  return <LegalPage doc={termsOfUse} />;
}
