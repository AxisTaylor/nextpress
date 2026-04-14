import React from 'react';
import { transformAssetUrl } from '@/utils/url';

export interface WPImport {
  name: string;
  path: string;
}

export interface ImportMapProps {
  imports: WPImport[];
  instance?: string;
  pathname?: string;
}

/**
 * Server component that renders a `<script type="importmap">` tag from
 * the WPImport entries returned by the assetsByUri GraphQL query.
 *
 * Import maps allow `<script type="module">` tags to resolve bare
 * specifiers like `@wordpress/interactivity` to actual URLs. The paths
 * use __NEXTPRESS_ASSETS__ placeholders which are first rewritten by
 * replaceProxyPlaceholders then routed through the NextPress asset proxy.
 */
export function ImportMap({ imports, instance = 'default', pathname = '' }: ImportMapProps) {
  if (!imports || imports.length === 0) {
    return null;
  }

  const map: Record<string, string> = {};
  for (const entry of imports) {
    // Paths use the RELATIVE scheme (e.g. "/wp-includes/js/...").
    // Route them through the NextPress asset proxy.
    map[entry.name] = transformAssetUrl(entry.path, instance);
  }

  const json = JSON.stringify({ imports: map });

  return (
    <script
      type="importmap"
      id="wp-importmap"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
