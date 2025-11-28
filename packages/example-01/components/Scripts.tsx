import type { PropsWithChildren } from 'react';
import { RenderScripts, EnqueuedScript } from "nextpress";


export interface ScriptsProps {
  scripts: EnqueuedScript[];
  type?: 'header' | 'footer';
}

export default function Scripts({ scripts, type, children }: PropsWithChildren<ScriptsProps>) {
  return <RenderScripts scripts={scripts} type={type}>{children}</RenderScripts>;
}