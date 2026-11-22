import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import type { LegalDoc } from "@/lib/site/legal";

/** The Privacy Policy and Terms of Use: a plain reading page in the site's frame. */
export default function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <PageShell>
      <article className="legal-page">
        <div className="wrap legal-wrap">
          <span className="kicker">Legal</span>
          <h1 className="display">{doc.title}</h1>
          <p className="legal-updated">Last updated: {doc.updated}</p>
          <p className="legal-intro">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              {s.body.map((p, i) =>
                Array.isArray(p) ? (
                  <ul key={i}>
                    {p.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i}>{p}</p>
                ),
              )}
            </section>
          ))}
          <p className="legal-also">
            See also: <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Use</Link>
          </p>
        </div>
      </article>
    </PageShell>
  );
}
