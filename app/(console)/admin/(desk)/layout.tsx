import Brand from "@/components/brand";
import DeskNotifications, { type DeskNotification } from "@/components/desk-notifications";
import { btnQuiet } from "@/components/ui";
import { requireStaff, ROLE_HOME, ROLE_LABEL } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

export default async function DeskLayout({
  children,
}: LayoutProps<"/admin">) {
  const staff = await requireStaff();

  // The nurse and doctor desks receive hand-offs, reception hears when a
  // visit it checked in is completed or a caller is sent over, and the owner
  // hears of complaint calls, so those open a realtime channel.
  const wantsAlerts = ["receptionist", "nurse", "doctor", "owner"].includes(staff.role);
  let unread: DeskNotification[] = [];

  if (wantsAlerts) {
    const supabase = await createClient();
    const read = (columns: string) =>
      supabase
        .from("notifications")
        .select(columns)
        .eq("recipient_id", staff.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(30)
        .overrideTypes<DeskNotification[], { merge: false }>();
    // link arrives with migration 20261108000031; until then, without it.
    const withLink = await read("id, visit_id, title, body, created_at, link");
    const { data } = withLink.error ? await read("id, visit_id, title, body, created_at") : withLink;
    unread = data ?? [];
  }

  const initials = staff.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-hairline bg-surface/80 shadow-card backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Brand subtitle={ROLE_LABEL[staff.role]} />

          <div className="flex items-center gap-2 sm:gap-4">
            {wantsAlerts && (
              <DeskNotifications
                staffId={staff.id}
                basePath={ROLE_HOME[staff.role]}
                initial={unread}
              />
            )}

            <span
              title={`${staff.full_name} · ${staff.email}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-extrabold text-primary"
            >
              {initials}
            </span>

            <form action={signOut}>
              <button type="submit" className={btnQuiet}>
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* On phones the role is pushed under the wordmark rather than hidden. */}
        <div className="border-t border-hairline px-4 py-1.5 text-xs text-muted sm:hidden">
          {ROLE_LABEL[staff.role]} · {staff.full_name}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
