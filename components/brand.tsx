import Image from "next/image";

/**
 * Wordmark for the console.
 *
 * The DS monogram from the logo plus plain type. The full lockup's script
 * "Soul" is lovely on a sign and unreadable at 18px in a sticky header, so the
 * mark carries the brand and the type stays out of the way.
 */
export default function Brand({
  size = "md",
  subtitle,
}: {
  size?: "sm" | "md";
  subtitle?: string;
}) {
  const type = size === "sm" ? "text-base" : "text-lg";
  const glyph = size === "sm" ? 28 : 34;

  return (
    <span className="flex items-center gap-2.5">
      <Image
        src="/brand/mark.png"
        alt=""
        width={glyph}
        height={glyph}
        loading="eager"
        className="shrink-0"
      />

      <span className={`${type} font-semibold tracking-tight`}>
        DermaSoul
        <span className="text-muted"> Aesthetics</span>
      </span>

      {subtitle && (
        <span className="hidden border-l border-hairline pl-2.5 text-sm text-muted sm:inline">
          {subtitle}
        </span>
      )}
    </span>
  );
}

/** The full logo, for the sign-in and landing pages where there is room. */
export function BrandLockup({ width = 220 }: { width?: number }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="DermaSoul Medical Aesthetics by Dr. Nusrat Liza"
      width={width}
      height={Math.round((width * 866) / 933)}
      loading="eager"
    />
  );
}
