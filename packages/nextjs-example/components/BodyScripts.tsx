'use client';
import { BodyScripts as NextPressBodyScripts, useScriptsReady, EnqueuedScript } from "@axistaylor/nextpress/client";

/**
 * BodyScripts Component
 *
 * Renders WordPress scripts that should be loaded before closing </body>.
 * Uses the new BodyScripts RSC component instead of deprecated RenderScripts.
 */
export default function BodyScripts({ scripts }: { scripts: EnqueuedScript[] }) {
  const { headScriptsLoaded, setBodyScriptsLoaded } = useScriptsReady();
  return (
    <NextPressBodyScripts
      scripts={scripts}
      waitFor={headScriptsLoaded}
      onComplete={() => setBodyScriptsLoaded(true)}
      instance="default"
    />
  );
}
