import React, { Fragment } from 'react';
import Script from 'next/script';
import { EnqueuedScript, ScriptLoadingGroupEnum } from '@/types';
import { getWPInstance } from '@/config/getWPInstance';
import { replaceProxyPlaceholders, transformWcSettings } from '@/compatibility/woocommerce';

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
 * Joins script content from string or array format
 */
function joinScriptContent(content: (string | null | undefined)[] | string | null | undefined): string {
  if (!content) return '';
  if (Array.isArray(content)) return content.join('');
  return content;
}

/**
 * Determines if a script URL is external (different origin) or a WordPress asset.
 * External scripts should be loaded directly, WordPress assets should be proxied.
 */
function isExternalScript(scriptUrl: string, wpHomeUrl: string): boolean {
  try {
    const scriptOrigin = new URL(scriptUrl).origin;
    const backendOrigin = new URL(wpHomeUrl).origin;
    return scriptOrigin !== backendOrigin;
  } catch {
    return false;
  }
}

export interface BodyScriptsProps {
  scripts: EnqueuedScript[];
  instance?: string;
  pathname?: string;
}

/**
 * Server component that renders WordPress footer scripts using next/script.
 * Scripts are rendered with strategy="afterInteractive" to load after page hydration.
 * Dependency ordering is handled server-side by the WordPress assetsByUri GraphQL query.
 *
 * External scripts (CDNs, payment gateways) are loaded directly.
 * WordPress assets are proxied through Next.js middleware.
 */
export function BodyScripts({ scripts, instance = 'default', pathname = '' }: BodyScriptsProps) {
  const footerScripts = scripts.filter(
    script => script.location === ScriptLoadingGroupEnum.FOOTER
  );

  if (footerScripts.length === 0) {
    return null;
  }

  const { wpHomeUrl } = getWPInstance(instance);
  const frontendUrl = process.env.wcr_frontend_url || '';

  return (
    <>
      <Script id="nextpress-body-scripts-start" strategy="afterInteractive">
        {`/* nextpress:body-scripts-start */`}
      </Script>
      {footerScripts.map((script) => {
        // Transform src URL
        let src = '';
        if (script.src) {
          if (isExternalScript(script.src, wpHomeUrl)) {
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

        const handle = script.handle || script.id;

        // Process extraData with proxy placeholder replacement
        const extraData = script.extraData
          ? replaceProxyPlaceholders(script.extraData, instance, pathname)
          : null;

        // Process before script content
        const beforeContent = joinScriptContent(script.before);
        // For wc-settings, transform the before script to replace WordPress URLs
        const beforeScript = beforeContent
          ? (script.handle === 'wc-settings'
              ? transformWcSettings(beforeContent, frontendUrl, instance)
              : beforeContent)
          : null;

        const afterScript = joinScriptContent(script.after);

        return (
          <Fragment key={handle}>
            {extraData && (
              <Script
                id={`${handle}-js-extra`}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{ __html: extraData }}
              />
            )}
            {beforeScript && (
              <Script
                id={`${handle}-js-before`}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{ __html: beforeScript }}
              />
            )}
            {src && (
              <Script
                id={handle as string}
                src={src}
                strategy="afterInteractive"
              />
            )}
            {afterScript && (
              <Script
                id={`${handle}-js-after`}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{ __html: afterScript }}
              />
            )}
          </Fragment>
        );
      })}
      <Script id="nextpress-body-scripts-end" strategy="afterInteractive">
        {`/* nextpress:body-scripts-end */`}
      </Script>
    </>
  );
}
