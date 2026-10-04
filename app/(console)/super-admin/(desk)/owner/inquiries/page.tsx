import Link from "next/link";
import { card, cardPad, EmptyState, SectionHead } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatClinicDate, formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import InquiryItem from "./inquiry-item";

const PAGE = 50;

/** What visitors sent from the website's "Book a Consultation" form. */
export default async function InquiriesPage({
  searchParams,
}: PageProps<"/super-admin/owner/inquiries">) {
  await requireRole("owner");
  const sp = await searchParams;
  const unreadOnly = sp.show === "unread";
  const limit = Math.min(500, Math.max(PAGE, Number(sp.limit) || PAGE));

  const supabase = await createClient();
  let q = supabase
    .from("inquiries")
    .select("id, name, email, message, is_read, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (unreadOnly) q = q.eq("is_read", false);

  const [{ data, count, error }, { count: unread }] = await Promise.all([
    q,
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("is_read", false),
  ]);

  const items = (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    message: r.message as string,
    is_read: r.is_read as boolean,
    when: `${formatClinicDate(r.created_at)}, ${formatClinicTime(r.created_at)}`,
  }));

  const tab = (key: "all" | "unread", label: string) => {
    const active = (key === "unread") === unreadOnly;
    return (
      <Link
        href={key === "unread" ? "?show=unread" : "?"}
        aria-current={active ? "page" : undefined}
        className={`rounded-full border px-3.5 py-1.5 text-sm font-bold transition-ui ${
          active
            ? "border-white bg-white text-fg"
            : "border-white/25 bg-white/10 text-hero-fg hover:border-white/50 hover:bg-white/20"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <section className="hero animate-rise relative overflow-hidden rounded-card px-6 py-7 shadow-lift sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-hero-fg/60">
              Inquiries
            </p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-[28px]">From the website</h1>
            <p className="mt-1 text-sm text-hero-fg/75">
              {unread ?? 0} unread · sent from &ldquo;Book a Consultation&rdquo;
            </p>
          </div>
          <Link
            href="/super-admin/owner"
            className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
          >
            <span aria-hidden="true">←</span>
            Back to dashboard
          </Link>
        </div>
        <nav aria-label="Filter" className="mt-7 flex gap-2">
          {tab("all", "All")}
          {tab("unread", `Unread${unread ? ` · ${unread}` : ""}`)}
        </nav>
      </section>

      <section className={`${card} ${cardPad}`}>
        <SectionHead
          title={unreadOnly ? "Unread inquiries" : "All inquiries"}
          hint="Newest first. Opening one marks it read; reply goes from your own email app."
        />
        {error ? (
          <p className="mt-5 rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            <strong>The database is not ready for this yet.</strong> Run the website migration
            (supabase/migrations/20261004000015) in Supabase, then reload.
          </p>
        ) : items.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title={unreadOnly ? "Nothing unread" : "No inquiries yet"}
              hint="When someone sends the form on the website, it appears here."
            />
          </div>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-hairline">
              {items.map((q) => (
                <InquiryItem key={q.id} inquiry={q} />
              ))}
            </ul>
            {(count ?? 0) > items.length && (
              <div className="mt-5 text-center">
                <Link
                  href={`?${unreadOnly ? "show=unread&" : ""}limit=${limit + PAGE}`}
                  scroll={false}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Load more
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
