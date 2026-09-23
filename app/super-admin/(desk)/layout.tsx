import { requireStaff, ROLE_LABEL } from "@/lib/auth";
import { signOut } from "../login/actions";

/**
 * Shell for every signed-in desk. The login page sits outside this route
 * group, so it does not inherit the auth gate.
 */
export default async function DeskLayout({
  children,
}: LayoutProps<"/super-admin">) {
  const staff = await requireStaff();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="no-print flex flex-wrap items-baseline justify-between gap-3 border-b border-line bg-paper px-7 py-5">
        <div>
          <span className="font-serif text-xl">
            Lum<em className="italic text-rose">e</em>n &amp; Leaf
          </span>
          <span className="ml-3 text-sm text-ink-soft">
            {ROLE_LABEL[staff.role]}
          </span>
        </div>
        <div className="flex items-baseline gap-4">
          <span className="text-sm text-ink-soft">{staff.full_name}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-sage underline underline-offset-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
