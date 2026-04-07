'use client';

import { usePathname } from 'next/navigation';
import { AssetUpdater as BaseAssetUpdater, AssetData } from "@axistaylor/nextpress/client";

export interface AssetUpdaterProps {
  fetchAssets: (uri: string) => Promise<AssetData>;
  instance?: string;
}


export function AssetUpdater(props: AssetUpdaterProps) {
  const pathname = usePathname();
  console.log('[AssetUpdater] Current pathname:', pathname);
  return (
    <BaseAssetUpdater
      fetchAssets={props.fetchAssets}
      instance={props.instance}
      pathname={pathname}
    />
  );
}