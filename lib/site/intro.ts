/**
 * The page's "intro is over" signal, sent by <IntroDone /> as the page mounts.
 * Anything that should play "as the page opens" (the header, the hero's
 * entrance) subscribes here.
 */
let done = false;
const listeners = new Set<() => void>();

export function markIntroDone() {
  if (done) return;
  done = true;
  listeners.forEach((fn) => fn());
  listeners.clear();
}

export function onIntroDone(fn: () => void) {
  if (done) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
