import { certs, certsIntro } from "@/lib/site/content";
import { certIcons } from "@/components/site/Icons";

/** Two marquee rows running opposite ways; hovering pauses them. */
export default function Certifications() {
  const row = (reverse: boolean) => (
    <div className={`marquee cert-marquee ${reverse ? "is-reverse" : ""}`}>
      <div className="marquee-track">
        {[0, 1].map((dup) => (
          <div className="marquee-group" key={dup} aria-hidden={dup === 1 || reverse}>
            {certs.map((c, i) => {
              const Icon = certIcons[i];
              return (
                <span key={c} className="cert-chip">
                  <Icon width={20} height={20} />
                  {c}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="certs" id="certifications" aria-labelledby="certs-title">
      <div className="wrap sec-head center">
        <span className="kicker">{certsIntro.kicker}</span>
        <h2 id="certs-title" className="display sm">
          Certifications <em>&amp;</em> Societies
        </h2>
      </div>
      {row(false)}
      {row(true)}
    </section>
  );
}
