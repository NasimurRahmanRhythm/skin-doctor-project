/**
 * Wordmark for the console.
 *
 * A small leaf glyph plus plain type — the prototype's italic serif read as a
 * spa brochure, which is the wrong register for a screen staff work in all
 * day. The mark carries the brand; the type stays out of the way.
 */
export default function Brand({
  size = "md",
  subtitle,
}: {
  size?: "sm" | "md";
  subtitle?: string;
}) {
  const type = size === "sm" ? "text-base" : "text-lg";
  const glyph = size === "sm" ? 16 : 18;

  return (
    <span className="flex items-center gap-2.5">
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="shrink-0 text-primary"
      >
        <path
          d="M10 18C10 18 3 14.5 3 8.5C3 5 5.5 2 10 2C14.5 2 17 5 17 8.5C17 14.5 10 18 10 18Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M10 18V7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M10 10.5L13 7.5M10 12.5L7 9.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>

      <span className={`${type} font-semibold tracking-tight`}>
        Lumen
        <span className="text-muted"> &amp; </span>
        Leaf
      </span>

      {subtitle && (
        <span className="hidden border-l border-hairline pl-2.5 text-sm text-muted sm:inline">
          {subtitle}
        </span>
      )}
    </span>
  );
}
