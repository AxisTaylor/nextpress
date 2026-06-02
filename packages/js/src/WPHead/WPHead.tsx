import React from 'react';
import { EnqueuedScript, EnqueuedStylesheet, GlobalStylesType } from '@/types';
import { WPScripts } from '@/WPScripts';
import { GlobalStyles } from '@/GlobalStyles';
import { Stylesheets } from '@/Stylesheets';
import { ImportMap, WPImport } from '@/ImportMap';

export interface WPHeadProps {
  scripts: EnqueuedScript[];
  stylesheets?: EnqueuedStylesheet[];
  globalStyles?: GlobalStylesType | null;
  importMap?: WPImport[];
  instance?: string;
  pathname?: string;
  /**
   * Handles of stylesheets that should keep blocking first paint
   * (typically theme + critical layout sheets). Everything else is
   * deferred — fetched with `media="print"` and promoted on load.
   * Forwarded to `Stylesheets`.
   */
  criticalHandles?: string[];
  /**
   * Defer theme.json `@font-face` declarations so they don't block
   * first paint. Pass `false` to keep fonts on the critical path
   * (e.g. when text above the fold relies on glyphs that don't
   * exist in any system fallback). Forwarded to `GlobalStyles`,
   * default `true`.
   */
  deferFonts?: boolean;
  /**
   * Defer theme.json `stylesheet` content (custom-property bindings
   * + base block-supports rules). Default `false` — these usually
   * carry layout-critical tokens, so deferring causes a token
   * flash on first paint. Forwarded to `GlobalStyles`.
   */
  deferGlobalStyles?: boolean;
  /**
   * Suppress the WP `@font-face` block — set when the host app
   * loads its own webfonts (e.g. via `next/font`). Forwarded to
   * `GlobalStyles`. Takes precedence over `deferFonts`.
   */
  skipFonts?: boolean;
}

/**
 * Server component that renders all WordPress head assets: global styles,
 * stylesheets, the script module import map, and header scripts.
 */
export function WPHead({ scripts, stylesheets, globalStyles, importMap, instance = 'default', pathname = '', criticalHandles, deferFonts, deferGlobalStyles, skipFonts }: WPHeadProps) {
  return (
    <>
      {stylesheets && stylesheets.length > 0 && (
        <Stylesheets
          stylesheets={stylesheets}
          instance={instance}
          pathname={pathname}
          criticalHandles={criticalHandles}
        />
      )}
      {globalStyles && (
        <GlobalStyles
          globalStyles={globalStyles}
          instance={instance}
          pathname={pathname}
          deferFonts={deferFonts}
          deferGlobalStyles={deferGlobalStyles}
          skipFonts={skipFonts}
        />
      )}
      {importMap && importMap.length > 0 && (
        <ImportMap imports={importMap} instance={instance} pathname={pathname} />
      )}
      <WPScripts scripts={scripts} location="head" instance={instance} pathname={pathname} />
    </>
  );
}

/** @deprecated Use `WPHead` instead. */
export const HeadScripts = WPHead;
/** @deprecated Use `WPHeadProps` instead. */
export type HeadScriptsProps = WPHeadProps;
