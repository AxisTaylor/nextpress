import { PropsWithChildren } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";

import { fetchStylesAndScriptsByUri, fetchGlobalStyles } from '@/lib/utils';
import { fetchAssets } from '@/actions/fetchAssets';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AssetUpdater } from "@/components/AssetUpdater";
import { WPHead, WPFooter } from "@axistaylor/nextpress";


import "@/app/wordpress.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextPress E2E Tests",
  description: "End-to-end testing for NextPress with WordPress backend",
};

// Force dynamic rendering to prevent caching of WordPress scripts/styles with stale nonces
export const dynamic = 'force-dynamic';

// Sheets that must paint above the fold. Anything outside this list
// ships as `media="print"` and is promoted to `media="all"` once it
// has loaded — so Lighthouse stops counting them as render-blocking.
//
// Adjust to match the active theme: include the theme's main handle
// (typically `<theme-slug>-style`) plus any layout-critical sheets.
const CRITICAL_STYLESHEET_HANDLES = [
  'wp-block-library',
  'wp-block-library-theme',
  'global-styles',
  'classic-theme-styles',
  // Active theme shipped with backend-4-examples:
  'custom-block-theme-style',
];

export default async function WordPressLayout({
  children,
}: Readonly<PropsWithChildren>) {
  const uri = (await headers()).get('x-uri') || '/';
  const [{ stylesheets, scripts, importMap }, globalStyles] = await Promise.all([
    fetchStylesAndScriptsByUri(uri),
    fetchGlobalStyles(),
  ]);

  return (
    <html lang="en">
      <head>
        <WPHead
          scripts={scripts}
          stylesheets={stylesheets}
          globalStyles={globalStyles}
          importMap={importMap}
          pathname={uri}
          criticalHandles={CRITICAL_STYLESHEET_HANDLES}
        />
      </head>
      <body className={inter.className}>
          <Navbar />
          <main className="min-h-screen px-4 py-8 max-w-7xl mx-auto">
            {children}
          </main>
          <WPFooter scripts={scripts} pathname={uri} />
          <AssetUpdater fetchAssets={fetchAssets} />
          <Footer />
      </body>
    </html>
  );
}
