import Link from "next/link";
import ColumnChart from "@/components/column-chart";
import { BarList, Panel } from "@/components/call-report";
import {
  btnGhost,
  btnPrimary,
  card,
  cardPad,
  field,
  SectionHead,
  tableEl,
  tableWrap,
  tdCell,
  thCell,
  trRow,
} from "@/components/ui";
import { requireRole, ROLE_HOME } from "@/lib/auth";
import { clinicToday, formatDateOfBirth } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Website stats" };

type SiteReport = {
  totals: {
    visits: number;
    page_views: number;
    view_content: number;
    contacts: number;
    book_clicks: number;
    leads: number;
    mobile: number;
  };
  days: { day: string; visits: number; leads: number }[];
  pages: { path: string; views: number }[];
  treatments: { name: string; views: number }[];
  contacts: Record<string, number>;
  sources: { source: string; visits: number; leads: number }[];
  campaigns: { campaign: string; source: string; visits: number; leads: number }[];
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (day: string, n: number) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const shortDay = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(
    new Date(`${day}T00:00:00Z`),
  );
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

/** A page path the owner recognises: "/" is the home page. */
const pageName = (path: string) => (path === "/" ? "Home" : path);

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-control border border-hairline bg-subtle/50 px-4 py-3">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className="mt-1 block text-2xl font-extrabold tabular leading-none">{value}</span>
      {note && <span className="mt-1 block text-xs text-muted">{note}</span>}
    </div>
  );
}

/**
 * The website's own numbers (public.site_events): visits, what people look
 * at, how they get in touch, and which sources and ad campaigns bring
 * inquiries. Counted by the site itself, so an ad-blocker does not hide them.
 */
export default async function WebsiteStatsPage({ searchParams }: PageProps<"/admin/owner/website-stats">) {
  const viewer = await requireRole("owner", "supervisor");
  const sp = await searchParams;
  const today = clinicToday();
  const to = typeof sp.to === "string" && DATE.test(sp.to) && sp.to <= today ? sp.to : today;
  const fromParam = typeof sp.from === "string" && DATE.test(sp.from) ? sp.from : "";
  const from = fromParam && fromParam <= to ? fromParam : addDays(to, -29);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("site_report", { p_from: from, p_to: to });
  const report = data as SiteReport | null;
  const t = report?.totals;

  return (
    <div className="space-y-6">
      <section className="hero animate-rise relative overflow-hidden rounded-card px-6 py-7 shadow-lift sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-hero-fg/60">Website</p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-[28px]">Website stats</h1>
            <p className="mt-1 text-sm text-hero-fg/75">
              {formatDateOfBirth(from)} – {formatDateOfBirth(to)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {viewer.role === "supervisor" && (
              <Link
                href="/admin/owner/call-center"
                className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
              >
                Call center
                <span aria-hidden="true">→</span>
              </Link>
            )}
            <Link
              href={ROLE_HOME[viewer.role]}
              className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
            >
              <span aria-hidden="true">←</span>
              Dashboard
            </Link>
          </div>
        </div>
      </section>

      <form className={`${card} ${cardPad} flex flex-wrap items-end gap-3`}>
        <label className="text-xs font-bold text-muted">
          From
          <input type="date" name="from" defaultValue={from} max={today} className={`${field} mt-1.5`} />
        </label>
        <label className="text-xs font-bold text-muted">
          To
          <input type="date" name="to" defaultValue={to} max={today} className={`${field} mt-1.5`} />
        </label>
        <button type="submit" className={btnPrimary}>
          Show
        </button>
        {[7, 30, 90].map((n) => (
          <Link key={n} href={`?from=${addDays(today, -(n - 1))}&to=${today}`} className={btnGhost}>
            Last {n} days
          </Link>
        ))}
      </form>

      {error || !report || !t ? (
        <p className="rounded-card border border-dashed border-hairline px-5 py-4 text-sm text-muted">
          Run migration 20261114000033 in Supabase to start counting. Numbers appear here as visitors arrive.
        </p>
      ) : (
        <>
          <section className={`${card} ${cardPad}`}>
            <SectionHead
              title="At a glance"
              hint="A visit is one person's time on the site, from opening it to closing the tab."
            />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Visits" value={t.visits} note={`${pct(t.mobile, t.visits)} on a phone`} />
              <Stat label="Pages viewed" value={t.page_views} />
              <Stat label="Treatment views" value={t.view_content} />
              <Stat label="Contact taps" value={t.contacts} note="WhatsApp, Instagram, phone" />
              <Stat label="Opened the form" value={t.book_clicks} note="From another page" />
              <Stat label="Inquiries" value={t.leads} />
              <Stat label="Visits → inquiry" value={pct(t.leads, t.visits)} />
              <Stat label="Form → inquiry" value={pct(t.leads, t.book_clicks)} />
            </div>

            <div className="mt-5">
              <Panel title="Visits per day">
                <ColumnChart
                  ariaLabel={`Visits per day, ${t.visits} in total`}
                  labelEvery={Math.max(1, Math.ceil(report.days.length / 5))}
                  columns={report.days.map((d) => ({
                    key: d.day,
                    label: shortDay(d.day),
                    value: d.visits,
                    tip: `${shortDay(d.day)}: ${d.visits} ${d.visits === 1 ? "visit" : "visits"} · ${d.leads} ${
                      d.leads === 1 ? "inquiry" : "inquiries"
                    }`,
                  }))}
                />
              </Panel>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <Panel title="Most viewed pages">
              <BarList
                rows={report.pages.map((p) => ({ label: pageName(p.path), value: p.views }))}
                total={t.page_views}
                empty="No visits yet."
              />
            </Panel>
            <Panel title="Most viewed treatments">
              <BarList
                rows={report.treatments.map((x) => ({ label: x.name, value: x.views }))}
                total={t.view_content}
                empty="No treatment pages opened yet."
              />
            </Panel>
            <Panel title="How people got in touch">
              <BarList
                rows={Object.entries(report.contacts)
                  .map(([label, value]) => ({ label, value: Number(value) }))
                  .sort((a, b) => b.value - a.value)}
                total={t.contacts}
                empty="No contact taps yet."
              />
            </Panel>
          </section>

          <section className={`${card} ${cardPad}`}>
            <SectionHead
              title="Where visitors came from"
              hint="From the ad's campaign tags when the link has them, otherwise from the site that sent them. Inquiries count for the visit they came from."
            />
            <div className={`mt-5 ${tableWrap}`}>
              <table className={`${tableEl} min-w-[520px]`}>
                <thead>
                  <tr>
                    <th className={`${thCell} rounded-tl-card`}>Source</th>
                    <th className={`${thCell} text-right`}>Visits</th>
                    <th className={`${thCell} text-right`}>Inquiries</th>
                    <th className={`${thCell} rounded-tr-card text-right`}>Visits → inquiry</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sources.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={`${tdCell} text-center text-muted`}>No visits yet.</td>
                    </tr>
                  ) : (
                    report.sources.map((s) => (
                      <tr key={s.source} className={trRow}>
                        <td className={`${tdCell} font-semibold capitalize`}>{s.source}</td>
                        <td className={`${tdCell} text-right tabular`}>{s.visits}</td>
                        <td className={`${tdCell} text-right font-bold tabular`}>{s.leads}</td>
                        <td className={`${tdCell} text-right tabular`}>{pct(s.leads, s.visits)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="mt-7 text-sm font-extrabold">Ad campaigns</h3>
            <p className="mt-0.5 text-xs text-muted">
              Only links tagged with utm_campaign show here. In Meta Ads Manager, add to the ad&rsquo;s URL
              parameters: <code className="font-mono">utm_source=facebook&amp;utm_campaign=&#123;&#123;campaign.name&#125;&#125;</code>
            </p>
            <div className={`mt-3 ${tableWrap}`}>
              <table className={`${tableEl} min-w-[620px]`}>
                <thead>
                  <tr>
                    <th className={`${thCell} rounded-tl-card`}>Campaign</th>
                    <th className={thCell}>Source</th>
                    <th className={`${thCell} text-right`}>Visits</th>
                    <th className={`${thCell} text-right`}>Inquiries</th>
                    <th className={`${thCell} rounded-tr-card text-right`}>Visits → inquiry</th>
                  </tr>
                </thead>
                <tbody>
                  {report.campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`${tdCell} text-center text-muted`}>
                        No tagged ad visits in this range.
                      </td>
                    </tr>
                  ) : (
                    report.campaigns.map((c) => (
                      <tr key={c.campaign} className={trRow}>
                        <td className={`${tdCell} font-semibold`}>{c.campaign}</td>
                        <td className={`${tdCell} capitalize`}>{c.source}</td>
                        <td className={`${tdCell} text-right tabular`}>{c.visits}</td>
                        <td className={`${tdCell} text-right font-bold tabular`}>{c.leads}</td>
                        <td className={`${tdCell} text-right tabular`}>{pct(c.leads, c.visits)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
