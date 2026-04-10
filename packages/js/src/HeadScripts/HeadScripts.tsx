import React, { Fragment } from 'react';
import Script from 'next/script';
import { EnqueuedScript, ScriptLoadingGroupEnum, ScriptLoadingStrategyEnum, ScriptTypeEnum } from '@/types';
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
 * Server component that renders WordPress header scripts.
 *
 * Classic scripts without a defer/async strategy use next/script with
 * strategy="beforeInteractive" so they execute in document order before
 * React hydration.
 *
 * Scripts with strategy="defer" or type="module" are rendered as plain
 * <script> tags with the appropriate attributes, since next/script does
 * not support the `defer` or `type` attributes.
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
      <Script id="nextpress-head-scripts-start" strategy="beforeInteractive">
        {`/* nextpress:head-scripts-start */`}
      </Script>
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
        const isModule = String(script.type) === ScriptTypeEnum.MODULE;
        const isDeferred = String(script.strategy) === ScriptLoadingStrategyEnum.DEFER;
        const isAsync = String(script.strategy) === ScriptLoadingStrategyEnum.ASYNC;

        // ES modules: plain <script type="module">
        if (isModule) {
          return src ? (
            <script key={handle} id={handle as string} type="module" src={src} />
          ) : null;
        }

        // Deferred/async scripts: plain <script> with the appropriate attribute.
        // next/script doesn't support defer/async attributes, and
        // beforeInteractive would execute them before the DOM is parsed,
        // which breaks view scripts that need to find block elements.
        if ((isDeferred || isAsync) && src) {
          return (
            <Fragment key={handle}>
              {script.extraData && (
                <script
                  id={`${handle}-js-extra`}
                  dangerouslySetInnerHTML={{ __html: script.extraData }}
                />
              )}
              {script.before && (
                <script
                  id={`${handle}-js-before`}
                  dangerouslySetInnerHTML={{ __html: joinScriptContent(script.before) }}
                />
              )}
              <script
                id={handle as string}
                src={src}
                defer={isDeferred || undefined}
                async={isAsync || undefined}
              />
              {script.after && (
                <script
                  id={`${handle}-js-after`}
                  dangerouslySetInnerHTML={{ __html: joinScriptContent(script.after) }}
                />
              )}
            </Fragment>
          );
        }

        // All other classic scripts: next/script beforeInteractive
        return (
          <Fragment key={handle}>
            {script.extraData && (
              <Script
                id={`${handle}-js-extra`}
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{ __html: script.extraData }}
              />
            )}
            {script.before && (
              <Script
                id={`${handle}-js-before`}
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
                id={`${handle}-js-after`}
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{ __html: joinScriptContent(script.after) }}
              />
            )}
          </Fragment>
        );
      })}
      <Script id="nextpress-head-scripts-end" strategy="beforeInteractive">
        {`/* nextpress:head-scripts-end */`}
      </Script>
    </>
  );
}
