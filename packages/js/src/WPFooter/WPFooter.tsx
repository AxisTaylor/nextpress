import React from 'react';
import { EnqueuedScript } from '@/types';
import { WPScripts } from '@/WPScripts';

export interface WPFooterProps {
  scripts: EnqueuedScript[];
  instance?: string;
  pathname?: string;
}

/**
 * Server component that renders WordPress body/footer scripts.
 */
export function WPFooter({ scripts, instance = 'default', pathname = '' }: WPFooterProps) {
  return (
    <WPScripts scripts={scripts} location="body" instance={instance} pathname={pathname} />
  );
}

/** @deprecated Use `WPFooter` instead. */
export const BodyScripts = WPFooter;
/** @deprecated Use `WPFooterProps` instead. */
export type BodyScriptsProps = WPFooterProps;
