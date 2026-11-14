"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { noteArrival, record } from "@/lib/site/analytics";
import { META_PIXEL_ID, track, trackCustom } from "@/lib/site/pixel";

/** The channel a link opens, if it is one of the ways to reach the clinic. */
function contactChannel(href: string): string | null {
  if (href.startsWith("tel:")) return "Phone";
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href)) return "WhatsApp";
  if (/^https?:\/\/(ig\.me\/m|(www\.)?instagram\.com\/direct)\//i.test(href)) return "Instagram DM";
  return null;
}

/**
 * The Meta Pixel, on the public website only (the admin console has its own
 * layout and never loads it).
 *
 * Meta's snippet counts the first page; the site moves between pages without
 * a reload, so each later page is counted here as the path changes. Clicks
 * are watched once, for the whole site: a phone, WhatsApp or Instagram DM
 * link is a Contact — so no button anywhere needs wiring up by hand.
 *
 * Opening the inquiry form from another page of the site is a BookClick. It
 * is counted when the form opens rather than when the button is pressed: the
 * button reloads the page, which can swallow an event sent on the way out.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  // The page last counted. It starts as the first page, which the snippet
  // counts itself; a repeat run of the effect (React may run it twice) is
  // then not a new page.
  const counted = useRef(pathname);
  // Whether this visit to the form has had its BookClick, so a repeat run of
  // the effect does not send a second one.
  const booked = useRef(false);
  // The page the site's own counter last recorded (null: none yet, so the
  // first page is counted too).
  const recorded = useRef<string | null>(null);

  useEffect(() => {
    // The site's own counter (lib/site/analytics) sees every page, the first
    // included, whether or not Meta is blocked.
    if (recorded.current !== pathname) {
      recorded.current = pathname;
      noteArrival();
      record("page_view");
    }
    const from = counted.current;
    if (from !== pathname) {
      counted.current = pathname;
      track("PageView");
    }
    if (pathname !== "/inquiry") {
      booked.current = false;
      return;
    }
    if (booked.current) return;
    booked.current = true;
    // Came from elsewhere on the site: by moving here, or by a reload whose
    // referrer is one of our pages.
    const ref = document.referrer ? new URL(document.referrer) : null;
    const previous =
      from !== pathname ? from : ref && ref.origin === window.location.origin && ref.pathname !== "/inquiry" ? ref.pathname : null;
    if (previous) {
      trackCustom("BookClick", { content_name: previous });
      record("book_click", previous);
    }
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      const channel = contactChannel(href);
      if (channel) {
        track("Contact", { content_name: channel });
        record("contact", channel);
      }
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  if (!META_PIXEL_ID) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(META_PIXEL_ID)});
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta's no-JavaScript fallback, a 1px beacon */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(META_PIXEL_ID)}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
