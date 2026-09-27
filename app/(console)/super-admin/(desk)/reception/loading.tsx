import { card, cardPad, Skeleton } from "@/components/ui";

/** Shown while the server component fetches. Mirrors the real layout so the
    page does not jump when the data lands. */
export default function Loading() {
  return (
    <div className={`${card} ${cardPad} space-y-4`}>
      <Skeleton className="h-5 w-44" />
      <Skeleton className="h-3.5 w-72" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
