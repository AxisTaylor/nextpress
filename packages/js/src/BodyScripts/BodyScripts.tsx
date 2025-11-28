import { useEffect, useRef } from 'react';
import { EnqueuedScript, ScriptLoadingGroupEnum, ScriptLoadingStrategyEnum } from '@/types';
import { sortScriptsByDependencies } from '@/utils/sortScriptsByDependencies';
import { processWcSettings, replaceProxyPlaceholders } from '@/compatibility/woocommerce';

// Global cache to track which scripts have been loaded
// Prevents duplicate loads across component remounts
const LoadCache = new Set<string>();

// Global cache for WordPress backend URLs by instance slug
// Prevents redundant API calls across component remounts
const BackendUrlCache = new Map<string, string>();

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

/**
 * Decodes a string using XOR cipher with salt
 */
function decodeWithSalt(encoded: string, salt: string): string {
  const encodedBytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const saltBytes = new TextEncoder().encode(salt);
  const decoded = new Uint8Array(encodedBytes.length);

  for (let i = 0; i < encodedBytes.length; i++) {
    decoded[i] = encodedBytes[i] ^ saltBytes[i % saltBytes.length];
  }

  return new TextDecoder().decode(decoded);
}

/**
 * Fetches the WordPress backend URL for a given instance slug.
 * Uses cache to avoid redundant API calls.
 */
async function getBackendUrl(instance: string): Promise<string> {
  // Check cache first
  if (BackendUrlCache.has(instance)) {
    return BackendUrlCache.get(instance)!;
  }

  try {
    const response = await fetch(`/atx/${instance}/proxiee`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch backend URL: ${response.status}`);
    }

    const data = await response.json();
    // Decode using XOR cipher with salt
    const salt = process.env.wcr_salt || 'nextpress-default-salt';
    const backendUrl = decodeWithSalt(data.d, salt);

    // Cache the result
    BackendUrlCache.set(instance, backendUrl);

    return backendUrl;
  } catch (error) {
    console.error(`[BodyScripts] Failed to fetch backend URL for instance "${instance}":`, error);
    throw error;
  }
}

/**
 * Determines if a script URL is external (different origin) or a WordPress asset.
 * External scripts should be loaded directly, WordPress assets should be proxied.
 */
function isExternalScript(scriptUrl: string, backendUrl: string): boolean {
  try {
    const scriptOrigin = new URL(scriptUrl).origin;
    const backendOrigin = new URL(backendUrl).origin;
    return scriptOrigin !== backendOrigin;
  } catch {
    // If URL parsing fails, assume it's a WordPress asset
    return false;
  }
}

export interface BodyScriptsProps {
  scripts: EnqueuedScript[];
  instance?: string;
  waitFor: boolean;
  onComplete?: () => void;
}

/**
 * Client component that loads footer/body scripts sequentially.
 * Scripts are sorted by dependencies and loaded one at a time.
 * Each script must complete before the next begins loading.
 *
 * Only begins loading after waitFor prop is true (HeadScripts complete).
 *
 * Based on Next.js Script component patterns but modified for sequential dependency loading.
 */
export function BodyScripts({ scripts, instance = 'default', waitFor, onComplete }: BodyScriptsProps) {
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Wait for HeadScripts to complete before starting
    if (!waitFor) {
      return;
    }

    // Prevent double execution in strict mode
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;

    // Filter for footer scripts only
    const footerScripts = scripts.filter(
      script => script.location === ScriptLoadingGroupEnum.FOOTER
    );

    if (footerScripts.length === 0) {
      // No footer scripts, trigger DOMContentLoaded and complete
      triggerDOMContentLoaded();
      if (onComplete) {
        onComplete();
      }
      return;
    }

    // Sort scripts by dependencies
    const sortedScripts = sortScriptsByDependencies(footerScripts);

    let currentIndex = 0;
    let backendUrl: string | null = null;

    // Fetch backend URL before loading scripts
    getBackendUrl(instance)
      .then(url => {
        backendUrl = url;
        loadNextScript();
      })
      .catch(error => {
        console.error('[BodyScripts] Failed to get backend URL, loading scripts anyway:', error);
        // Continue without backend URL check (will proxy all scripts)
        loadNextScript();
      });

    const loadNextScript = () => {
      if (currentIndex >= sortedScripts.length) {
        // All scripts loaded, trigger DOMContentLoaded and call onComplete
        triggerDOMContentLoaded();
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
        // Check if script is external (different origin from WordPress backend)
        if (backendUrl && isExternalScript(script.src, backendUrl)) {
          // External script - load directly without proxy
          src = script.src;
        } else {
          // WordPress asset - proxy through Next.js
          const path = extractPath(script.src);
          const isInternalRoute = /^\/wp-(?:includes|admin)\//;

          if (isInternalRoute.test(path)) {
            src = `/atx/${instance}/wp-internal-assets${path}`;
          } else {
            src = `/atx/${instance}/wp-assets${path}`;
          }
        }
      }

      // Handle after script
      let afterScript: string | undefined;
      if (script.after) {
        afterScript = Array.isArray(script.after) ? script.after.join(' ') : script.after;
      }

      // Create and inject extraData script
      if (script.extraData) {
        const extraEl = document.createElement('script');
        extraEl.id = `${script.handle}-extra`;
        // Replace proxy placeholders in extraData (e.g., for Stripe Express Checkout params)
        extraEl.textContent = replaceProxyPlaceholders(script.extraData, instance);
        document.body.appendChild(extraEl);
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
        document.body.appendChild(beforeEl);

        // Process wc-settings after its before script loads
        if (script.handle === 'wc-settings') {
          processWcSettings(instance);
        }
      }

      // Create main script element
      const onScriptLoad = () => {
        // Inject after script if present
        if (afterScript) {
          const afterEl = document.createElement('script');
          afterEl.id = `${script.handle}-after`;
          afterEl.textContent = afterScript;
          document.body.appendChild(afterEl);
        }

        LoadCache.add(cacheKey);
        loadNextScript();
      };

      if (src) {
        // External script
        const el = document.createElement('script');
        el.id = script.handle as string;
        el.src = src;

        // Respect async/defer for footer scripts
        if (script.strategy === ScriptLoadingStrategyEnum.ASYNC) {
          el.async = true;
        } else if (script.strategy === ScriptLoadingStrategyEnum.DEFER) {
          el.defer = true;
        }

        el.addEventListener('load', onScriptLoad);
        el.addEventListener('error', (e) => {
          console.error(`[BodyScripts] Failed to load script: ${script.handle}`, e);
          // Continue loading next script even on error
          LoadCache.add(cacheKey);
          loadNextScript();
        });

        document.body.appendChild(el);
      } else {
        // Inline script or no src
        // Already handled by extraData and before scripts above
        // Just mark as loaded and continue
        LoadCache.add(cacheKey);
        loadNextScript();
      }
    };

    // Note: loadNextScript() is now called from the getBackendUrl() promise
  }, [scripts, waitFor, onComplete, instance]);

  // Render nothing - this is a client-only side effect component
  return null;
}

/**
 * Triggers DOMContentLoaded event for scripts that depend on it.
 * This allows WordPress view scripts that listen for DOMContentLoaded to execute.
 */
function triggerDOMContentLoaded() {
  if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    const event = new Event('DOMContentLoaded', { bubbles: true, cancelable: true });
    document.dispatchEvent(event);
  }
}
