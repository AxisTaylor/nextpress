/**
 * Normalize protocol-relative URLs so `new URL()` can parse them
 * without a base argument. The placeholder scheme is only used to
 * satisfy URL parsing — host comparison ignores it.
 */
function withScheme(url: string): string {
  return url.startsWith('//') ? `http:${url}` : url;
}

function getHost(url: string): string | null {
  try {
    return new URL(withScheme(url)).host;
  } catch {
    return null;
  }
}

/**
 * Extracts the path from a URL, removing the protocol and domain.
 */
export function extractPath(url: string): string {
  try {
    return new URL(withScheme(url)).pathname;
  } catch {
    return url;
  }
}

/**
 * Regex that matches WordPress internal asset paths (wp-includes, wp-admin).
 */
export const isInternalRoute = /^\/wp-(?:includes|admin)\//;

/**
 * Determines if a script URL is external (different host) or a WordPress asset.
 * External scripts should be loaded directly, WordPress assets should be proxied.
 *
 * Compares by host instead of origin so protocol-relative URLs and scheme
 * mismatches (e.g. http asset on an https page) still classify correctly.
 */
export function isExternalScript(scriptUrl: string, instanceHomeUrls: string[]): boolean {
  const scriptHost = getHost(scriptUrl);
  if (scriptHost === null) {
    return false;
  }
  return !instanceHomeUrls.some(url => getHost(url) === scriptHost);
}

export function isScriptForAnotherInstance(scriptUrl: string, instances: Record<string, string>): string | false {
  const scriptHost = getHost(scriptUrl);
  if (scriptHost === null) {
    return false;
  }
  for (const [slug, url] of Object.entries(instances)) {
    if (getHost(url) === scriptHost) {
      return slug;
    }
  }
  return false;
}

/**
 * Transforms a WordPress asset URL into a NextPress proxy URL.
 * Internal WP assets (wp-includes, wp-admin) route through /atx/{instance}/wp-internal-assets/,
 * all other assets route through /atx/{instance}/wp-assets/.
 */
export function transformAssetUrl(src: string, instance: string): string {
  const path = extractPath(src);
  const prefix = isInternalRoute.test(path) ? 'wp-internal-assets' : 'wp-assets';
  return `/atx/${instance}/${prefix}${path}`;
}

/**
 * Resolves the final href for a WordPress asset, choosing between:
 * - A foreign-instance proxy when the URL belongs to a known other instance.
 * - The original src when the URL points to a non-WordPress origin (CDNs,
 *   payment gateways, web fonts).
 * - The current instance's proxy otherwise.
 */
export function resolveAssetHref(
  src: string,
  instance: string,
  wpHomeUrl: string,
  otherInstances: Record<string, string>,
): string {
  const foreignSlug = isScriptForAnotherInstance(src, otherInstances);
  if (foreignSlug) {
    return transformAssetUrl(src, foreignSlug);
  }
  if (isExternalScript(src, [wpHomeUrl, ...Object.values(otherInstances)])) {
    return src;
  }
  return transformAssetUrl(src, instance);
}
