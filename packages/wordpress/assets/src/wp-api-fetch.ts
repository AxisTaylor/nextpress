/**
 * Custom wp-api-fetch implementation for headless WordPress environments.
 *
 * This script replaces the core WordPress wp-api-fetch script to ensure
 * proper nonce handling and API routing in Next.js headless setups.
 *
 * Configuration is provided by NextPress via window.nextPressConfig (injected by HeadScripts)
 * and window.wpApiSettings (from WordPress wp_localize_script).
 *
 * @package NextPress
 */

import apiFetch from '@wordpress/api-fetch';

// Extend window interface for TypeScript
declare global {
    interface Window {
        nextPressConfig?: {
            instance: string;
            rootURL: string;
            nonceEndpoint: string;
        };
        wpApiSettings?: {
            nonce: string;
        };
        wp: {
            apiFetch: typeof apiFetch & {
                nonceMiddleware?: any;
                nonceEndpoint?: string;
                mediaUploadMiddleware?: any;
            };
        };
    }
}

// Initialize wp namespace
window.wp = window.wp || {} as any;

// Export apiFetch to window.wp
window.wp.apiFetch = apiFetch;

// Auto-configure for headless environment
// Waits for both nextPressConfig (from Next.js) and wpApiSettings (from WordPress)
if (typeof window.nextPressConfig !== 'undefined' && typeof window.wpApiSettings !== 'undefined') {
    // Configure root URL with instance slug (routes through Next.js proxy)
    window.wp.apiFetch.use(
        window.wp.apiFetch.createRootURLMiddleware(window.nextPressConfig.rootURL)
    );

    // Configure nonce middleware
    window.wp.apiFetch.nonceMiddleware = window.wp.apiFetch.createNonceMiddleware(
        window.wpApiSettings.nonce
    );
    window.wp.apiFetch.use(window.wp.apiFetch.nonceMiddleware);

    // Add media upload middleware (if available)
    if (window.wp.apiFetch.mediaUploadMiddleware) {
        window.wp.apiFetch.use(window.wp.apiFetch.mediaUploadMiddleware);
    }

    // Set nonce endpoint through Next.js proxy with instance slug
    // This allows wp-api-fetch to automatically fetch fresh nonces when current one expires
    window.wp.apiFetch.nonceEndpoint = window.nextPressConfig.nonceEndpoint;
}
