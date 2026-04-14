import React from 'react';
import { EnqueuedScript, GlobalStylesType } from '@/types';
import { WPScripts } from '@/WPScripts';
import { GlobalStyles } from '@/GlobalStyles';
import { ImportMap, WPImport } from '@/ImportMap';

export interface HeadScriptsProps {
  scripts: EnqueuedScript[];
  globalStyles?: GlobalStylesType | null;
  importMap?: WPImport[];
  instance?: string;
  pathname?: string;
}

/**
 * Server component that renders WordPress head assets: global styles,
 * the script module import map, and header scripts.
 */
export function HeadScripts({ scripts, globalStyles, importMap, instance = 'default', pathname = '' }: HeadScriptsProps) {
  return (
    <>
      {globalStyles && (
        <GlobalStyles globalStyles={globalStyles} instance={instance} pathname={pathname} />
      )}
      {importMap && importMap.length > 0 && (
        <ImportMap imports={importMap} instance={instance} pathname={pathname} />
      )}
      <WPScripts scripts={scripts} location="head" instance={instance} pathname={pathname} />
    </>
  );
}
