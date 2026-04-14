'use client';

import { usePageEvents } from '@/hooks/usePageEvents';

export interface PageEventsProps {
  pathname: string;
}

/**
 * Client component that fires synthetic page lifecycle events
 * (DOMContentLoaded, load) so WordPress scripts can initialize.
 *
 * Use this if you're NOT using AssetUpdater (which fires these events
 * internally). Place it in your layout's <body> alongside your scripts.
 *
 * ```tsx
 * <BodyScripts scripts={scripts} pathname={uri} />
 * <PageEvents pathname={pathname} />
 * ```
 */
export function PageEvents({ pathname }: PageEventsProps) {
  usePageEvents(pathname);
  return null;
}
