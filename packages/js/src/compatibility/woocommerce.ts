/**
 * WooCommerce Compatibility Layer
 * Handles URL transformation for WooCommerce Blocks configuration and encoding/decoding
 */

/**
 * Replaces NextPress proxy placeholders in a string with actual URLs.
 *
 * Handles two types of placeholders:
 * 1. __NEXTPRESS_PROXY__ - Page URLs → replaced with frontend origin
 * 2. __NEXTPRESS_ASSETS__ - Asset URLs → replaced with proxy route
 *
 * @param content - String content potentially containing placeholders
 * @param instance - WordPress instance slug for proxy route
 * @returns String with placeholders replaced
 */
export function replaceProxyPlaceholders(content: string, instance: string): string {
  if (!content) {
    return content;
  }

  const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const proxyRouteBase = `/atx/${instance}`;

  let result = content;

  // Replace page URL placeholder (with scheme)
  // Handles both escaped (JSON) and unescaped URLs:
  // - 'http:\/\/__NEXTPRESS_PROXY__\/checkout\/' (escaped)
  // - 'http://__NEXTPRESS_PROXY__/checkout/' (unescaped)
  if (result.includes('__NEXTPRESS_PROXY__')) {
    // Match escaped slashes (\/) or regular slashes (/)
    result = result.replace(/https?:(\\\/|\/)(\\\/|\/)__NEXTPRESS_PROXY__/g, (match) => {
      // Preserve the escaping style from the original
      const isEscaped = match.includes('\\/');
      return isEscaped ? frontendOrigin.replace(/\//g, '\\/') : frontendOrigin;
    });
  }

  // Replace asset URL placeholder (with scheme)
  // Handles both escaped (JSON) and unescaped URLs
  if (result.includes('__NEXTPRESS_ASSETS__')) {
    result = result.replace(/https?:(\\\/|\/)(\\\/|\/)__NEXTPRESS_ASSETS__/g, (match) => {
      const isEscaped = match.includes('\\/');
      return isEscaped ? proxyRouteBase.replace(/\//g, '\\/') : proxyRouteBase;
    });
  }

  return result;
}

/**
 * Processes wcSettings after it's loaded to replace proxy placeholders
 * This should be called after wc-settings script loads.
 *
 * Handles two types of placeholders:
 * 1. __NEXTPRESS_PROXY__ - Page URLs (cart, checkout, etc.) → replaced with frontend origin
 * 2. __NEXTPRESS_ASSETS__ - Asset URLs (plugins, site URLs) → replaced with proxy route
 *
 * @param instance - WordPress instance slug
 */
// Extend Window interface for WooCommerce settings
declare global {
  interface Window {
    wcSettings?: WcSettings;
  }
}

export function processWcSettings(instance: string): void {
  const wcSettings = window.wcSettings;

  if (!wcSettings) {
    console.warn('[processWcSettings] wcSettings not found on window');
    return;
  }

  // Get frontend origin (e.g., 'http://localhost:3000')
  const frontendOrigin = window.location.origin;

  // Proxy route base (e.g., '/atx/default')
  const proxyRouteBase = `/atx/${instance}`;

  // Recursive function to replace placeholders
  function processValue(value: unknown): unknown {
    if (typeof value === 'string') {
      // Replace page URL placeholder (with scheme)
      // e.g., 'http://__NEXTPRESS_PROXY__/checkout/' becomes 'http://localhost:3000/checkout/'
      if (value.includes('__NEXTPRESS_PROXY__')) {
        return value.replace(/https?:\/\/__NEXTPRESS_PROXY__/, frontendOrigin);
      }

      // Replace asset URL placeholder (with scheme)
      // e.g., 'http://__NEXTPRESS_ASSETS__/wp-content/plugins/...' becomes '/atx/default/wp-content/plugins/...'
      if (value.includes('__NEXTPRESS_ASSETS__')) {
        return value.replace(/https?:\/\/__NEXTPRESS_ASSETS__/, proxyRouteBase);
      }

      return value;
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(item => processValue(item));
      } else {
        const processed: Record<string, unknown> = {};
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            processed[key] = processValue((value as Record<string, unknown>)[key]);
          }
        }
        return processed;
      }
    }
    return value;
  }

  // Process all settings
  window.wcSettings = processValue(wcSettings) as WcSettings;
}

/**
 * JavaScript implementation of PHP's rawurlencode().
 * Encodes according to RFC 3986.
 *
 * @param str - String to encode
 * @returns URL-encoded string
 */
function rawurlencode(str: string): string {
  return encodeURIComponent(str);
}

/**
 * JavaScript implementation of PHP's esc_js() function.
 * Escapes text strings for echoing in JS. It is intended to be used for inline JS
 * (in a tag attribute, for example onclick="...").
 *
 * WordPress implementation:
 * ```php
 * $safe_text = wp_check_invalid_utf8( $text );
 * $safe_text = _wp_specialchars( $safe_text, ENT_COMPAT );
 * $safe_text = preg_replace( '/&#(x)?0*(?(1)27|39);?/i', "'", stripslashes( $safe_text ) );
 * $safe_text = str_replace( "\r", '', $safe_text );
 * $safe_text = str_replace( "\n", '\\n', addslashes( $safe_text ) );
 * ```
 *
 * Key operations:
 * - Uses addslashes() which escapes: single quotes, double quotes, backslashes, and NULL
 * - Replaces newlines with \\n
 * - Removes carriage returns
 *
 * @param text - Text to escape
 * @returns Escaped text safe for use in JavaScript
 */
function esc_js(text: string): string {
  let safe = text;

  // Remove carriage returns
  safe = safe.replace(/\r/g, '');

  // Apply addslashes escaping: escape backslashes, single quotes, double quotes
  // Note: Must escape backslashes FIRST before escaping quotes
  safe = safe.replace(/\\/g, '\\\\');      // Escape backslashes
  safe = safe.replace(/'/g, "\\'");         // Escape single quotes
  safe = safe.replace(/"/g, '\\"');         // Escape double quotes

  // Replace newlines with escaped newlines
  safe = safe.replace(/\n/g, '\\n');

  return safe;
}

/**
 * Reverses the esc_js() escaping.
 * Unescapes backslash sequences added by addslashes().
 *
 * @param text - Escaped text
 * @returns Unescaped text
 */
function unescape_js(text: string): string {
  let unescaped = text;

  // Reverse the operations in reverse order
  // Replace escaped newlines with actual newlines
  unescaped = unescaped.replace(/\\n/g, '\n');

  // Unescape addslashes escaping
  // Note: Must unescape in reverse order - quotes first, then backslashes
  unescaped = unescaped.replace(/\\"/g, '"');      // Unescape double quotes
  unescaped = unescaped.replace(/\\'/g, "'");      // Unescape single quotes
  unescaped = unescaped.replace(/\\\\/g, '\\');    // Unescape backslashes (must be last)

  return unescaped;
}

/**
 * Decodes a WooCommerce encoded beforeScript.
 * WooCommerce uses this encoding pattern in AssetDataRegistry.php:
 *
 * ```php
 * $data = rawurlencode( wp_json_encode( $this->data ) );
 * $script = "var wcSettings = JSON.parse( decodeURIComponent( '" . esc_js( $data ) . "' ) );";
 * ```
 *
 * @param beforeScript - The encoded script string
 * @returns Decoded target object and the original encoded string
 */
function decodeWcSettings<T>(beforeScript: string): { target: T, encodedString: string } {
  // Extract the encoded string from decodeURIComponent('...') or decodeURIComponent("...")
  const encodedMatch = beforeScript.match(/decodeURIComponent\(\s*['"]([^'"]+)['"]\s*\)/);
  if (!encodedMatch) {
    throw new Error('[decodeWcSettings] Could not find encoded string in beforeScript');
  }

  const encodedString = encodedMatch[1];

  // Step 1: Reverse esc_js() escaping
  const unescaped = unescape_js(encodedString);

  // Step 2: Decode URL encoding (reverse of rawurlencode)
  const decodedJson = decodeURIComponent(unescaped);

  // Step 3: Parse JSON (reverse of wp_json_encode)
  const target: T = JSON.parse(decodedJson);

  return { target, encodedString }
}

/**
 * Re-encodes a transformed WooCommerce settings object to match WordPress encoding.
 * Implements the same encoding pipeline as WooCommerce's AssetDataRegistry.php:
 *
 * ```php
 * $data = rawurlencode( wp_json_encode( $this->data ) );
 * $script = "var wcSettings = JSON.parse( decodeURIComponent( '" . esc_js( $data ) . "' ) );";
 * ```
 *
 * @param beforeScript - Original script string (to extract variable name)
 * @param encodedString - Original encoded string (for logging/comparison)
 * @param transformed - The modified settings object to encode
 * @returns Reconstructed beforeScript with transformed data
 */
function encodeWcSettings<T>(beforeScript: string, _encodedString: string, transformed: T): string {
  // Step 1: wp_json_encode() - Convert to JSON
  const json = JSON.stringify(transformed);

  // Step 2: rawurlencode() - URL encode
  const urlEncoded = rawurlencode(json);

  // Step 3: esc_js() - JavaScript string escaping
  const escaped = esc_js(urlEncoded);

  // Extract variable name from original script
  const varMatch = beforeScript.match(/var\s+(\w+)\s*=/);
  if (!varMatch) {
    throw new Error('[encodeWcSettings] Could not find variable declaration');
  }

  const varName = varMatch[1];

  // Reconstruct the script matching WordPress's exact format
  // WordPress uses single quotes in the template
  const result = `var ${varName} = JSON.parse( decodeURIComponent( '${escaped}' ) );`;

  return result;
}

interface WcSettings {
  storePages?: Record<string, { permalink?: string }>;
  homeUrl?: string;
  dashboardUrl?: string;
  wpLoginUrl?: string;
  wcBlocksConfig?: {
    pluginUrl?: string;
    productImages?: string;
    restApiRoutes?: Record<string, string>;
    homeUrl?: string;
  };
  stripe_settings?: {
    stripe_return_url?: string;
    stripe_checkout_url?: string;
  };
  [key: string]: unknown;
}

/**
 * Transforms wc-settings script by decrypting, modifying URLs, and re-encrypting.
 * Handles the complete transformation pipeline for WooCommerce Blocks configuration.
 *
 * @param beforeScript - The script content containing encoded wc-settings
 * @param frontendUrl - The frontend base URL (e.g., 'http://localhost:3000')
 * @param instance - The WordPress instance slug for API proxy routes
 * @param options - Optional configuration
 * @param options.rewriteLoginUrl - If true, replaces wpLoginUrl with frontend /login route
 * @returns Modified script with transformed URLs, or original script if transformation fails
 */
export function transformWcSettings(
  beforeScript: string,
  frontendUrl: string,
  instance: string,
  options: { rewriteLoginUrl?: boolean } = {}
): string {
  const { rewriteLoginUrl = false } = options;

  try {
    // Decode beforeScript
    const { target, encodedString } = decodeWcSettings<WcSettings>(beforeScript);

    // Clone to avoid mutations
    const transformed: WcSettings = JSON.parse(JSON.stringify(target));

    // 1. Replace storePages permalinks (cart, checkout, shop, myaccount, etc.)
    if (transformed.storePages) {
      for (const page in transformed.storePages) {
        if (transformed.storePages[page]?.permalink) {
          const originalUrl = transformed.storePages[page].permalink as string;
          // Extract the path from the WordPress URL
          const url = new URL(originalUrl);
          const path = url.pathname;
          // Replace with frontend URL + path
          transformed.storePages[page].permalink = `${frontendUrl}${path}`;
        }
      }
    }

    // 2. Replace homeUrl
    if (transformed.homeUrl && typeof transformed.homeUrl === 'string') {
      transformed.homeUrl = frontendUrl;
    }

    // 3. Replace dashboardUrl
    if (transformed.dashboardUrl && typeof transformed.dashboardUrl === 'string') {
      const originalUrl = transformed.dashboardUrl;
      try {
        const url = new URL(originalUrl);
        const path = url.pathname;
        transformed.dashboardUrl = `${frontendUrl}${path}`;
      } catch {
        // If URL parsing fails, just replace the domain
        transformed.dashboardUrl = transformed.dashboardUrl.replace(
          /^https?:\/\/[^\/]+/,
          frontendUrl
        );
      }
    }

    // 4. Replace wcBlocksConfig URLs
    if (transformed.wcBlocksConfig) {
      // Replace plugin URL to proxy through our middleware
      if (transformed.wcBlocksConfig.pluginUrl) {
        const originalUrl = transformed.wcBlocksConfig.pluginUrl;
        try {
          const url = new URL(originalUrl);
          const path = url.pathname;
          transformed.wcBlocksConfig.pluginUrl = `${frontendUrl}/atx/${instance}/wp-assets${path}`;
        } catch {
          // Keep original if parsing fails
        }
      }

      // Replace product images URL
      if (transformed.wcBlocksConfig.productImages) {
        const originalUrl = transformed.wcBlocksConfig.productImages;
        try {
          const url = new URL(originalUrl);
          const path = url.pathname;
          transformed.wcBlocksConfig.productImages = `${frontendUrl}/atx/${instance}/wp-assets${path}`;
        } catch {
          // Keep original if parsing fails
        }
      }

      // Replace homeUrl in wcBlocksConfig
      if (transformed.wcBlocksConfig.homeUrl) {
        transformed.wcBlocksConfig.homeUrl = frontendUrl;
      }

      // Replace REST API routes to point to our proxy
      if (transformed.wcBlocksConfig.restApiRoutes) {
        const newRoutes: Record<string, string> = {};
        for (const [key, value] of Object.entries(transformed.wcBlocksConfig.restApiRoutes)) {
          if (typeof value === 'string') {
            // Extract path from WordPress REST API URL and proxy it
            const path = value.replace(/^https?:\/\/[^\/]+/, '');
            newRoutes[key] = `${frontendUrl}/atx/${instance}/wp-json${path.replace('/wp-json', '')}`;
          } else {
            newRoutes[key] = value;
          }
        }
        transformed.wcBlocksConfig.restApiRoutes = newRoutes;
      }
    }

    // 5. Replace Stripe payment URLs
    if (transformed.stripe_settings) {
      if (transformed.stripe_settings.stripe_return_url) {
        const originalUrl = transformed.stripe_settings.stripe_return_url;
        try {
          const url = new URL(originalUrl);
          const path = url.pathname;
          const search = url.search;
          transformed.stripe_settings.stripe_return_url = `${frontendUrl}${path}${search}`;
        } catch {
          // Keep original if parsing fails
        }
      }

      if (transformed.stripe_settings.stripe_checkout_url) {
        const originalUrl = transformed.stripe_settings.stripe_checkout_url;
        try {
          const url = new URL(originalUrl);
          const path = url.pathname;
          const search = url.search;
          transformed.stripe_settings.stripe_checkout_url = `${frontendUrl}${path}${search}`;
        } catch {
          // Keep original if parsing fails
        }
      }
    }

    // 6. Optionally replace wpLoginUrl with frontend login route
    if (rewriteLoginUrl && transformed.wpLoginUrl) {
      transformed.wpLoginUrl = `${frontendUrl}/login`;
    }

    // NOTE: We intentionally DO NOT replace:
    // - adminUrl (WordPress admin should stay as WordPress backend)
    // - wpLoginUrl (unless rewriteLoginUrl option is enabled)
    // - wp_ajax_url (handled separately by middleware)
    // - External URLs (CDNs, payment gateways, etc.)

    // return re-encoded beforeScript
    return encodeWcSettings<WcSettings>(beforeScript, encodedString, transformed);
  } catch (e) {
    console.error('[transformWcSettings] Failed to transform wc-settings:', e);
    return beforeScript;
  }
}
