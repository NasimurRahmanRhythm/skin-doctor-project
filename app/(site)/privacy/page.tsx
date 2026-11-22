import type { Metadata } from "next";
import LegalPage from "@/components/site/LegalPage";
import { privacyPolicy } from "@/lib/site/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — DermaSoul Medical Aesthetics",
  description: "What DermaSoul Medical Aesthetics collects through its website, why, and who it is shared with.",
};

export default function PrivacyPage() {
  return <LegalPage doc={privacyPolicy} />;
}
