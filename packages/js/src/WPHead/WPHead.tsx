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
}

/**
 * Server component that renders all WordPress head assets: global styles,
 * stylesheets, the script module import map, and header scripts.
 */
export function WPHead({ scripts, stylesheets, globalStyles, importMap, instance = 'default', pathname = '' }: WPHeadProps) {
  return (
    <>
      {globalStyles && (
        <GlobalStyles globalStyles={globalStyles} instance={instance} pathname={pathname} />
      )}
      {stylesheets && stylesheets.length > 0 && (
        <Stylesheets stylesheets={stylesheets} instance={instance} pathname={pathname} />
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
