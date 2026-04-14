import React, { Fragment } from 'react';
import Script from 'next/script';
import { EnqueuedScript, ScriptLoadingGroupEnum, ScriptLoadingStrategyEnum, ScriptTypeEnum } from '@/types';
import { getNextPressConfigScript } from '@/compatibility/wordpress';
import { getAllWPInstances, getWPInstance } from '@/config/getWPInstance';
import { replaceProxyPlaceholders, transformWcSettings } from '@/compatibility/woocommerce';
import { isExternalScript, isScriptForAnotherInstance, transformAssetUrl } from '@/utils/url';
import { joinScriptContent } from '@/utils/content';

export interface WPScriptsProps {
  scripts: EnqueuedScript[];
  location: 'head' | 'body';
  instance?: string;
  pathname?: string;
}

/**
 * Server component that renders WordPress enqueued scripts for a given
 * location (head or body).
 *
 * Head scripts use strategy="beforeInteractive" (or plain <script defer>
 * for deferred scripts). Body scripts use strategy="afterInteractive".
 * ES modules render as plain <script type="module"> in both locations.
 *
 * Dependency ordering is handled server-side by the WordPress assetsByUri
 * GraphQL query. External scripts (CDNs, payment gateways) in the body
 * are loaded directly without proxying.
 */
export function WPScripts({ scripts, location, instance = 'default', pathname = '' }: WPScriptsProps) {
  const isHead = location === 'head';
  const group = isHead ? ScriptLoadingGroupEnum.HEADER : ScriptLoadingGroupEnum.FOOTER;
  const strategy = isHead ? 'beforeInteractive' as const : 'afterInteractive' as const;
  const markerId = isHead ? 'head' : 'body';

  const filtered = scripts.filter(script => script.location === group);

  if (filtered.length === 0) {
    return null;
  }

  const { wpHomeUrl } = getWPInstance(instance);
  const allInstances = Object.entries(getAllWPInstances())
    .reduce((acc, [slug, instance]) => {
      if (instance.wpHomeUrl === wpHomeUrl) {
        return acc;
      }

      acc[slug] = instance.wpHomeUrl;
      return acc;
    }, {} as Record<string, string>);
  const frontendUrl = process.env.wcr_frontend_url || '';

  return (
    <>
      <Script id={`nextpress-${markerId}-scripts-start`} strategy={strategy}>
        {`/* nextpress:${markerId}-scripts-start */`}
      </Script>
      {filtered.map((script) => {
        // Transform src URL
        let src = '';
        if (script.src) {
          const isExternal = isExternalScript(script.src, [wpHomeUrl, ...Object.values(allInstances)]);
          const isForAnotherInstance = isScriptForAnotherInstance(script.src, allInstances);
          // Body scripts: detect external scripts and load directly
          if (!isHead && isExternal) {
            src = script.src;
          } else if (isForAnotherInstance) {
            src = transformAssetUrl(script.src, isForAnotherInstance);
          } else {
            src = transformAssetUrl(script.src, instance);
          }
        }

        const handle = script.handle || script.id;
        const isModule = String(script.type) === ScriptTypeEnum.MODULE;
        const isDeferred = String(script.strategy) === ScriptLoadingStrategyEnum.DEFER;
        const isAsync = String(script.strategy) === ScriptLoadingStrategyEnum.ASYNC;

        // Process inline script content with proxy placeholder replacement
        const extraData = script.extraData
          ? replaceProxyPlaceholders(script.extraData, instance, pathname)
          : null;
        const beforeContent = joinScriptContent(script.before);
        const beforeScript = beforeContent
          ? (script.handle === 'wc-settings'
              ? transformWcSettings(beforeContent, frontendUrl, instance)
              : replaceProxyPlaceholders(beforeContent, instance, pathname))
          : null;
        const afterScript = joinScriptContent(script.after)
          ? replaceProxyPlaceholders(joinScriptContent(script.after), instance, pathname)
          : null;

        // ES modules: plain <script type="module">
        if (isModule) {
          return src ? (
            <script key={handle} id={handle as string} type="module" src={src} />
          ) : null;
        }

        // Determine the next/script strategy for this script:
        // - async scripts: beforeInteractive (load early, don't block)
        // - defer scripts: afterInteractive or lazyOnload (load after hydration)
        // - default: use the location-based strategy
        let scriptStrategy = strategy;
        if (isAsync) {
          scriptStrategy = 'beforeInteractive';
        } else if (isDeferred) {
          scriptStrategy = 'afterInteractive';
        }

        return (
          <Fragment key={handle}>
            {extraData && (
              <Script
                id={`${handle}-js-extra`}
                strategy={scriptStrategy}
                dangerouslySetInnerHTML={{ __html: extraData }}
              />
            )}
            {beforeScript && (
              <Script
                id={`${handle}-js-before`}
                strategy={scriptStrategy}
                dangerouslySetInnerHTML={{ __html: beforeScript }}
              />
            )}
            {script.handle === 'wp-api-fetch' && (
              <Script
                id="nextpress-config"
                strategy={scriptStrategy}
                dangerouslySetInnerHTML={{ __html: getNextPressConfigScript(instance) }}
              />
            )}
            {src && (
              <Script
                id={handle as string}
                src={src}
                strategy={scriptStrategy}
              />
            )}
            {afterScript && (
              <Script
                id={`${handle}-js-after`}
                strategy={scriptStrategy}
                dangerouslySetInnerHTML={{ __html: afterScript }}
              />
            )}
          </Fragment>
        );
      })}
      <Script id={`nextpress-${markerId}-scripts-end`} strategy={strategy}>
        {`/* nextpress:${markerId}-scripts-end */`}
      </Script>
    </>
  );
}
