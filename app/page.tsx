import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { btnPrimary, card } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className={`${card} w-full max-w-sm px-6 py-8 text-center sm:px-8`}>
        <div className="flex justify-center">
          <BrandLockup />
        </div>

        <p className="mt-7 text-sm leading-relaxed text-muted">
          The public site lives separately. Clinic staff sign in below.
        </p>

        <Link href="/super-admin" className={`${btnPrimary} mt-7 w-full`}>
          Staff sign in
        </Link>
      </div>
    </main>
  );
}
