'use client';

import { RenderStylesheets, EnqueuedStylesheet } from "@axistaylor/nextpress/client";

export default function Styles({ stylesheets }: { stylesheets: EnqueuedStylesheet[] }) {
  return <RenderStylesheets stylesheets={stylesheets} />;
}