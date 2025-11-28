'use client';
import { HeadScripts as NextPressHeadScripts, useScriptsReady, EnqueuedScript } from "@axistaylor/nextpress/client";

/**
 * HeadScripts Component
 *
 * Renders WordPress scripts that should be loaded in the <head> section.
 * Uses the new HeadScripts RSC component instead of deprecated RenderScripts.
 */
export default function HeadScripts({ scripts }: { scripts: EnqueuedScript[] }) {
  const { setHeadScriptsLoaded } = useScriptsReady();
  return (
    <NextPressHeadScripts
      scripts={scripts}
      onComplete={() => setHeadScriptsLoaded(true)}
      instance="default"
    />
  );

}
