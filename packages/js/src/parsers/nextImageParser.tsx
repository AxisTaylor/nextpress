import React, { type ComponentType } from 'react';
import Image, { type ImageProps } from 'next/image';
import type { DOMNode } from 'html-react-parser';
import type { CustomParser, ElementProps } from '@/parsers/types';
import { resolveAssetHref } from '@/utils/url';
import { getAllWPInstances, getWPInstance } from '@/config/getWPInstance';

export interface NextImageParserOptions {
  instance?: string;
  render?: ComponentType<ImageProps>;
}

export function toImageProps(attrs: ElementProps, src: string): ImageProps | null {
  const p = attrs as Record<string, unknown>;
  const width = parseInt(String(p.width ?? ''), 10) || 0;
  const height = parseInt(String(p.height ?? ''), 10) || 0;
  if (!width || !height) return null;

  const out: ImageProps = {
    src,
    alt: typeof p.alt === 'string' ? p.alt : '',
    width,
    height,
  };

  if (typeof p.sizes === 'string') out.sizes = p.sizes;
  if (typeof p.className === 'string') out.className = p.className;
  if (typeof p.title === 'string') out.title = p.title;
  if (typeof p.id === 'string') out.id = p.id;
  if (p.style) out.style = p.style as React.CSSProperties;
  if (p.loading === 'lazy' || p.loading === 'eager') out.loading = p.loading;
  if (p.fetchPriority === 'high' || p.fetchpriority === 'high') out.priority = true;
  if (typeof p.crossOrigin === 'string') out.crossOrigin = p.crossOrigin as ImageProps['crossOrigin'];
  if (typeof p.referrerPolicy === 'string') out.referrerPolicy = p.referrerPolicy as ImageProps['referrerPolicy'];

  for (const [key, value] of Object.entries(p)) {
    if (key.startsWith('data-')) {
      (out as Record<string, unknown>)[key] = value;
    }
  }

  return out;
}

export function nextImageParser({
  instance = 'default',
  render: Render = Image,
}: NextImageParserOptions = {}): CustomParser {
  const { wpHomeUrl } = getWPInstance(instance);
  const otherInstances = Object.entries(getAllWPInstances())
    .reduce((acc, [slug, entry]) => {
      if (entry.wpHomeUrl === wpHomeUrl) return acc;
      acc[slug] = entry.wpHomeUrl;
      return acc;
    }, {} as Record<string, string>);

  return (node: DOMNode, props: ElementProps) => {
    const el = node as unknown as { name?: string };
    if (el.name !== 'img') return undefined;

    const rawSrc = (props as Record<string, unknown>).src as string;
    if (!rawSrc) return undefined;

    const src = resolveAssetHref(rawSrc, instance, wpHomeUrl, otherInstances);
    const imageProps = toImageProps(props, src);
    if (!imageProps) return undefined;

    return <Render {...imageProps} />;
  };
}
