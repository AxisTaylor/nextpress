import { PropsWithChildren } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";

import { fetchStylesAndScriptsByUri } from '@/lib/utils';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Stylesheets from "@/components/Stylesheets";
import ScriptLoader from "@/components/ScriptLoader";
import HeadScripts from "@/components/HeadScripts";
import BodyScripts from "@/components/BodyScripts";

import "@/app/globals.css";

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
  const { stylesheets, scripts } = await fetchStylesAndScriptsByUri(uri);

  return (
    <ScriptLoader scripts={scripts}>
      <html lang="en">
        <head>
          <Stylesheets stylesheets={stylesheets} />
          <HeadScripts scripts={scripts} />
        </head>
        <body className={inter.className}>
          <Navbar />
          <main className="min-h-screen px-4 py-8 max-w-7xl mx-auto">
            {children}
          </main>
          <BodyScripts scripts={scripts} />
          <Footer />
        </body>
      </html>
    </ScriptLoader>
  );
}
