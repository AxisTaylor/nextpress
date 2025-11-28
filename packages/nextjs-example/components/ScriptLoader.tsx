'use client';
import type { PropsWithChildren } from 'react';
import { ScriptLoader as NextPressScriptLoader, EnqueuedScript } from "@axistaylor/nextpress/client";


export interface ScriptsProps {
  scripts: EnqueuedScript[];
}

export default function ScriptLoader({ scripts, children }: PropsWithChildren<ScriptsProps>) {
  return (
    <NextPressScriptLoader scripts={scripts}>
      {children}
    </NextPressScriptLoader>
  );
}