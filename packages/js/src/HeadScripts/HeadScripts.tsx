import { useEffect, useRef } from 'react';
import { EnqueuedScript, ScriptLoadingGroupEnum } from '../types';
import { sortScriptsByDependencies } from '../utils/sortScriptsByDependencies';
import { injectNextPressConfig } from '../compatibility/wordpress';

// Global cache to track which scripts have been loaded
// Prevents duplicate loads across component remounts
const LoadCache = new Set<string>();

/**
 * Extracts the path from a URL, removing the protocol and domain
 */
function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    // If URL parsing fails, assume it's already a path
    return url;
  }
}

export interface HeadScriptsProps {
  scripts: EnqueuedScript[];
  instance?: string;
  onComplete?: () => void;
}

/**
 * Client component that loads header scripts sequentially.
 * Scripts are sorted by dependencies and loaded one at a time.
 * Each script must complete before the next begins loading.
 *
 * Based on Next.js Script component patterns but modified for sequential dependency loading.
 */
export function HeadScripts({ scripts, instance = 'default', onComplete }: HeadScriptsProps) {
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in strict mode
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;

    // Filter for header scripts only
    const headerScripts = scripts.filter(
      script => script.location === ScriptLoadingGroupEnum.HEADER
    );

    if (headerScripts.length === 0) {
      // No header scripts, complete immediately
      if (onComplete) {
        onComplete();
      }
      return;
    }

    // Sort scripts by dependencies
    const sortedScripts = sortScriptsByDependencies(headerScripts);

    let currentIndex = 0;

    const loadNextScript = () => {
      if (currentIndex >= sortedScripts.length) {
        // All scripts loaded, call onComplete
        if (onComplete) {
          onComplete();
        }
        return;
      }

      const script = sortedScripts[currentIndex];
      currentIndex++;

      // Skip if already loaded
      const cacheKey = script.id || script.handle || script.src || `inline-${currentIndex}`;
      if (LoadCache.has(cacheKey)) {
        loadNextScript();
        return;
      }

      // Transform src URL
      let src = '';
      if (script.src) {
        const path = extractPath(script.src);
        const isInternalRoute = /^\/wp-(?:includes|admin)\//;

        if (isInternalRoute.test(path)) {
          src = `/atx/${instance}/wp-internal-assets${path}`;
        } else {
          src = `/atx/${instance}/wp-assets${path}`;
        }
      }

      // Get afterScript if it exists
      let afterScript: string | undefined;
      if (script.after) {
        afterScript = Array.isArray(script.after) ? script.after.join(' ') : script.after;
      }

      // Create and inject extraData script
      if (script.extraData) {
        const extraEl = document.createElement('script');
        extraEl.id = `${script.handle}-extra`;
        extraEl.textContent = script.extraData;
        document.head.appendChild(extraEl);
      }

      // Create and inject before script
      let beforeScript: string | undefined;
      if (script.before) {
        beforeScript = Array.isArray(script.before) ? script.before.join(' ') : script.before;
      }
      if (beforeScript) {
        const beforeEl = document.createElement('script');
        beforeEl.id = `${script.handle}-before`;
        beforeEl.textContent = beforeScript;
        document.head.appendChild(beforeEl);
      }

      // Inject NextPress config before wp-api-fetch loads
      if (script.handle === 'wp-api-fetch') {
        injectNextPressConfig(instance);
      }

      // Create main script element
      const onScriptLoad = () => {
        // Inject after script if present
        if (afterScript) {
          const afterEl = document.createElement('script');
          afterEl.id = `${script.handle}-after`;
          afterEl.textContent = afterScript;
          document.head.appendChild(afterEl);
        }

        LoadCache.add(cacheKey);
        loadNextScript();
      };

      if (src) {
        // External script
        const el = document.createElement('script');
        el.id = script.handle as string;
        el.src = src;
        // Force blocking - no async or defer for header scripts
        el.async = false;

        el.addEventListener('load', onScriptLoad);
        el.addEventListener('error', (e) => {
          console.error(`[HeadScripts] Failed to load script: ${script.handle}`, e);
          // Continue loading next script even on error
          LoadCache.add(cacheKey);
          loadNextScript();
        });

        document.head.appendChild(el);
      } else {
        // Inline script or no src
        // Already handled by extraData and before scripts above
        // Just mark as loaded and continue
        LoadCache.add(cacheKey);
        loadNextScript();
      }
    };

    // Start loading the first script
    loadNextScript();
  }, [scripts, onComplete, instance]);

  // Render nothing - this is a client-only side effect component
  return null;
}
