import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-md border border-line bg-paper px-8 py-10 text-center rounded-card">
        <h1 className="font-serif text-3xl">
          Lum<em className="italic text-rose">e</em>n &amp; Leaf
        </h1>
        <p className="mt-2 text-sm text-ink-soft">Skin &amp; Body Studio</p>

        <p className="mt-8 text-sm leading-relaxed text-ink-soft">
          The public site lives separately for now. Clinic staff sign in below.
        </p>

        <Link
          href="/super-admin"
          className="mt-8 inline-block border border-sage bg-sage px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-sage-deep rounded-card"
        >
          Staff sign in
        </Link>
      </div>
    </main>
  );
}
