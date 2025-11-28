'use client';

import { RenderStylesheets, EnqueuedStylesheet } from "nextpress/client";

export default function Styles({ stylesheets }: { stylesheets: EnqueuedStylesheet[] }) {
  return <RenderStylesheets stylesheets={stylesheets} />;
}