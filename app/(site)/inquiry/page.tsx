import type { Metadata } from "next";
import PageShell from "@/components/site/PageShell";
import { brand, inquiry } from "@/lib/site/content";
import InquiryForm from "./inquiry-form";

export const metadata: Metadata = {
  title: "Book a Consultation — DermaSoul Medical Aesthetics",
  description: "Send DermaSoul Medical Aesthetics an inquiry and we'll reply by email.",
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
                  {brand.phones.map((phone, i) => (
                    <span key={phone}>
                      {i > 0 && ", "}
                      <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>
                    </span>
                  ))}
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
