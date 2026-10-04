import type { Metadata } from "next";
import PageShell from "@/components/site/PageShell";
import { brand, inquiry } from "@/lib/site/content";
import InquiryForm from "./inquiry-form";

export const metadata: Metadata = {
  title: "Book a Consultation — DermaSoul Aesthetics",
  description: "Send DermaSoul Aesthetics an inquiry and we'll reply by email.",
};

/**
 * Where every "Book a Consultation" button leads. `?about=` carries the
 * treatment or package the visitor came from into the message.
 */
export default async function InquiryPage({ searchParams }: PageProps<"/inquiry">) {
  const sp = await searchParams;
  const about = typeof sp.about === "string" ? sp.about.slice(0, 120) : null;

  return (
    <PageShell>
      <section className="inquiry-page">
        <div className="wrap">
          <div className="inquiry-grid">
            <div className="inquiry-info">
              <span className="kicker">{inquiry.kicker}</span>
              <h1 className="display">
                Tell us about <em>your skin</em>
              </h1>
              <p>{inquiry.body}</p>
              <ul>
                <li>
                  <span>Visit</span>
                  {brand.addressLine}
                </li>
                <li>
                  <span>Hours</span>
                  {brand.hours.join(", ")}
                </li>
                <li>
                  <span>Phone</span>
                  <a href={`tel:${brand.phone.replace(/\s/g, "")}`}>{brand.phone}</a>
                </li>
              </ul>
            </div>
            <InquiryForm about={about} />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
