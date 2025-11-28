/**
 * WordPress Core Compatibility Layer
 * Handles nextPressConfig injection and REST API nonce management
 */

/**
 * Fetches a fresh WordPress REST API nonce
 *
 * @param instance - WordPress instance slug
 * @returns Promise resolving to nonce string
 */
export async function fetchRestNonce(instance: string): Promise<string> {
  try {
    const response = await fetch(`/atx/${instance}/wp?action=rest-nonce`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch REST nonce: ${response.status}`);
    }

    const nonce = await response.text();
    return nonce.trim();
  } catch (error) {
    console.error('[fetchRestNonce] Failed to fetch WordPress REST nonce:', error);
    throw error;
  }
}

/**
 * Injects nextPressConfig into the window object before wp-api-fetch loads
 * This should be called when the wp-api-fetch script is about to load.
 *
 * @param instance - WordPress instance slug
 */
export function injectNextPressConfig(instance: string): void {
  const configEl = document.createElement('script');
  configEl.id = 'nextpress-config';
  configEl.textContent = `
    // Preserve existing nextPressConfig properties (like wc)
    window.nextPressConfig = window.nextPressConfig || {};
    window.nextPressConfig.instance = '${instance}';
    window.nextPressConfig.rootURL = '/atx/${instance}/wp-json/';
    window.nextPressConfig.nonceEndpoint = '/atx/${instance}/wp?action=rest-nonce';
  `;
  document.head.appendChild(configEl);
}
