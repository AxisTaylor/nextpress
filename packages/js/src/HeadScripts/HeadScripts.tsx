import React, { Fragment } from 'react';
import Script from 'next/script';
import { EnqueuedScript, ScriptLoadingGroupEnum } from '@/types';
import { getNextPressConfigScript } from '@/compatibility/wordpress';

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

export interface HeadScriptsProps {
  scripts: EnqueuedScript[];
  instance?: string;
  pathname?: string;
}

/**
 * Server component that renders WordPress header scripts using next/script.
 * Scripts are rendered with strategy="beforeInteractive" to execute in document
 * order before any Next.js code runs. Dependency ordering is handled server-side
 * by the WordPress assetsByUri GraphQL query.
 */
export function HeadScripts({ scripts, instance = 'default', pathname: _pathname = '' }: HeadScriptsProps) {
  // Filter for header scripts only
  const headerScripts = scripts.filter(
    script => script.location === ScriptLoadingGroupEnum.HEADER
  );

  if (headerScripts.length === 0) {
    return null;
  }

  return (
    <>
      {headerScripts.map((script) => {
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

        const handle = script.handle || script.id;

        return (
          <Fragment key={handle}>
            {script.extraData && (
              <Script
                id={`${handle}-extra`}
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{ __html: script.extraData }}
              />
            )}
            {script.before && (
              <Script
                id={`${handle}-before`}
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{ __html: joinScriptContent(script.before) }}
              />
            )}
            {script.handle === 'wp-api-fetch' && (
              <Script
                id="nextpress-config"
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{ __html: getNextPressConfigScript(instance) }}
              />
            )}
            {src && (
              <Script
                id={handle as string}
                src={src}
                strategy="beforeInteractive"
              />
            )}
            {script.after && (
              <Script
                id={`${handle}-after`}
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{ __html: joinScriptContent(script.after) }}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}
