/**
 * The preloader curtain gates the hero's entrance. Anything that should play
 * "as the page opens" subscribes here instead of on mount, so it runs as the
 * curtain lifts rather than behind it.
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
