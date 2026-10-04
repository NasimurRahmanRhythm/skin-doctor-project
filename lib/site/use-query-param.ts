"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * One query parameter, kept in the address bar: `?t=<id>` opens a treatment,
 * `?p=<id>` a product, so a window can be linked to and survives a reload.
 *
 * Read straight from window.location rather than useSearchParams, which would
 * turn the whole static page into a client-only render. The server (and the
 * first paint) sees no parameter; the window opens right after hydration.
 */
const EVENT = "site:querychange";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useQueryParam(name: string): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );

  const set = useCallback(
    (next: string | null) => {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set(name, next);
      else url.searchParams.delete(name);
      // Keeps Next's own history state, so back/forward still work.
      window.history.replaceState(window.history.state, "", url);
      window.dispatchEvent(new Event(EVENT));
    },
    [name],
  );

  return [value, set];
}
