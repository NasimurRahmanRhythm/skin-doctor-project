import { requireRole } from "@/lib/auth";

export default async function Page() {
  const staff = await requireRole("owner");

  return (
    <div className="border border-line bg-paper px-8 py-10 rounded-card">
      <h1 className="font-serif text-2xl">Owner</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Signed in as {staff.full_name} ({staff.email}).
      </p>
      <p className="mt-6 text-sm text-ink-soft">Built out in a later phase.</p>
    </div>
  );
}
