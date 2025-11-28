import { RenderStylesheets, EnqueuedStylesheet } from "@axistaylor/nextpress";

/**
 * Stylesheets Component
 *
 * Renders WordPress stylesheets with proper ordering and inline styles.
 * Uses the RenderStylesheets RSC component.
 */
export default function Stylesheets({ stylesheets }: { stylesheets: EnqueuedStylesheet[] }) {
  return <RenderStylesheets stylesheets={stylesheets} instance="default" />;
}
