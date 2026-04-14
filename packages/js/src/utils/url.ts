/**
 * Extracts the path from a URL, removing the protocol and domain.
 */
export function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url;
  }
}

/**
 * Regex that matches WordPress internal asset paths (wp-includes, wp-admin).
 */
export const isInternalRoute = /^\/wp-(?:includes|admin)\//;

/**
 * Determines if a script URL is external (different origin) or a WordPress asset.
 * External scripts should be loaded directly, WordPress assets should be proxied.
 */
export function isExternalScript(scriptUrl: string, instanceHomeUrls: string[]): boolean {
  try {
    const scriptOrigin = new URL(scriptUrl).origin;
    return !instanceHomeUrls.some(url => new URL(url).origin === scriptOrigin);
  } catch {
    return false;
  }
}

export function isScriptForAnotherInstance(scriptUrl: string, instances: Record<string, string>): string | false {
  try {
    const scriptOrigin = new URL(scriptUrl).origin;
    for (const [slug, url] of Object.entries(instances)) {
      if (new URL(url).origin === scriptOrigin) {
        return slug;
      }
    }
    return false;
  } catch {
    return false;
  }
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
