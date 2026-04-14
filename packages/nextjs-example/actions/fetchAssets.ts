'use server';

import { fetchStylesAndScriptsByUri, fetchGlobalStyles } from '@/lib/utils';
import type { AssetData } from '@axistaylor/nextpress/client';

/**
 * Server action that fetches all NextPress asset data for a given URI.
 * Used by the AssetUpdater client component to refresh assets on
 * client-side navigation.
 */
export async function fetchAssets(uri: string): Promise<AssetData> {
  const [{ stylesheets, scripts, importMap }, globalStyles] = await Promise.all([
    fetchStylesAndScriptsByUri(uri),
    fetchGlobalStyles(),
  ]);

  return { stylesheets, scripts, globalStyles, importMap };
}
