"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { markAllRead } from "@/app/super-admin/(desk)/notification-actions";

export type DeskNotification = {
  id: string;
  visit_id: string | null;
  title: string;
  body: string | null;
  created_at: string;
};

type Props = {
  staffId: string;
  /** Where a notification should take this role when clicked. */
  basePath: string;
  initial: DeskNotification[];
};

/** Polling backstop, in case the websocket drops without telling us. */
const REFRESH_INTERVAL_MS = 30_000;

/**
 * Plays a short chime.
 *
 * Generated with the Web Audio API rather than shipping an audio file: no
 * asset to load, and it still works when the clinic's connection is flaky.
 * Browsers block audio until the page has been interacted with, so a failure
 * here is expected and silent — the badge and toast still land.
 */
function useChime() {
  const ctxRef = useRef<AudioContext | null>(null);

  return useCallback(() => {
    try {
      ctxRef.current ??= new AudioContext();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") void ctx.resume();

      const now = ctx.currentTime;
      for (const [i, freq] of [880, 1318.5].entries()) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.4);
      }
    } catch {
      // Audio is a nicety; never let it break the desk.
    }
  }, []);
}

export default function DeskNotifications({ staffId, basePath, initial }: Props) {
  const router = useRouter();
  const chime = useChime();

  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");

  const baseTitle = useRef<string>("");

  // The list itself is never mirrored into client state. It comes straight
  // from the server render, which applies RLS and reflects what has already
  // been marked read — so a realtime event only needs to trigger a refresh.
  const items = initial;

  // Unread count in the tab title, so a backgrounded tab still shows it.
  useEffect(() => {
    baseTitle.current ||= document.title.replace(/^\(\d+\)\s*/, "");
    document.title = items.length
      ? `(${items.length}) ${baseTitle.current}`
      : baseTitle.current;
  }, [items.length]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notif:${staffId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${staffId}`,
        },
        (payload) => {
          const row = payload.new as DeskNotification;
          // Toast and chime fire immediately; the badge and the queue arrive
          // with the refresh a moment later, from the server.
          setToast(row.body ? `${row.title} — ${row.body}` : row.title);
          chime();
          router.refresh();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLive("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setLive("offline");
        else if (status === "CLOSED") setLive("connecting");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [staffId, chime, router]);

  // Backstop: realtime can drop silently on clinic wifi. Without this a desk
  // can sit looking idle while patients are actually waiting.
  useEffect(() => {
    const refresh = () => router.refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <div className="relative flex items-center gap-3">
        <span
          title={
            live === "live"
              ? "Live — new patients appear instantly"
              : live === "offline"
                ? "Reconnecting — the list still refreshes every 30s"
                : "Connecting…"
          }
          className={`h-2 w-2 rounded-full ${
            live === "live"
              ? "bg-primary"
              : live === "offline"
                ? "bg-err"
                : "bg-ink-soft"
          }`}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="relative text-sm text-muted hover:text-fg"
        >
          Alerts
          {items.length > 0 && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] text-on-primary">
              {items.length}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-8 z-20 w-80 border border-hairline bg-surface shadow-lg rounded-card">
            {items.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">Nothing waiting.</p>
            ) : (
              <>
                <ul className="max-h-80 divide-y divide-hairline overflow-y-auto">
                  {items.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={n.visit_id ? `${basePath}/${n.visit_id}` : basePath}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-3 hover:bg-subtle"
                      >
                        <span className="block text-sm text-fg">{n.title}</span>
                        {n.body && (
                          <span className="block text-xs text-muted">{n.body}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
                <form
                  action={async () => {
                    await markAllRead();
                    setOpen(false);
                    router.refresh();
                  }}
                  className="border-t border-hairline px-4 py-2 text-right"
                >
                  <button type="submit" className="text-xs text-primary underline">
                    Mark all read
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border border-primary bg-primary-hover px-5 py-3 text-sm text-on-primary shadow-lg rounded-card">
          {toast}
        </div>
      )}
    </>
  );
}
