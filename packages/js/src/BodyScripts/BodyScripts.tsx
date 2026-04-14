import React from 'react';
import { EnqueuedScript } from '@/types';
import { WPScripts } from '@/WPScripts';

export interface BodyScriptsProps {
  scripts: EnqueuedScript[];
  instance?: string;
  pathname?: string;
}

/**
 * Server component that renders WordPress body/footer scripts.
 */
export function BodyScripts({ scripts, instance = 'default', pathname = '' }: BodyScriptsProps) {
  return (
    <WPScripts scripts={scripts} location="body" instance={instance} pathname={pathname} />
  );
}
