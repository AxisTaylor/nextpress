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
