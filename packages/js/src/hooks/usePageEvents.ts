import { useEffect, useRef } from 'react';

/**
 * Fires synthetic page lifecycle events that WordPress-enqueued scripts
 * depend on (DOMContentLoaded, load, nextpress:page-change).
 *
 * On the initial mount, scripts loaded via next/script afterInteractive
 * miss the real DOMContentLoaded because it fires before hydration
 * completes. This hook re-dispatches the events so those scripts can
 * initialize.
 *
 * On subsequent calls (e.g. client-side navigation), the events fire
 * again so scripts can re-initialize for the new page content.
 */
export function usePageEvents(pathname: string): void {
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      // Initial mount — fire events after a microtask so React hydration
      // has finished and the DOM matches the SSR content.
      hasMounted.current = true;
      queueMicrotask(() => {
        firePageEvents();
      });
      return;
    }

    // Subsequent navigations — fire immediately (AssetUpdater calls this
    // after it has finished inserting the new assets).
    firePageEvents();
  }, [pathname]);
}

/**
 * Dispatches synthetic page lifecycle events:
 * - `DOMContentLoaded` on document
 * - `load` on window
 * - `nextpress:page-change` custom event on document
 */
export function firePageEvents(): void {
  document.dispatchEvent(new Event('DOMContentLoaded'));
  window.dispatchEvent(new Event('load'));
  document.dispatchEvent(new CustomEvent('nextpress:page-change'));
}
