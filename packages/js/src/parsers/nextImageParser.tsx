import React from 'react';
import Image from 'next/image';
import type { DOMNode } from 'html-react-parser';
import type { CustomParser, ElementProps } from '@/parsers/types';

/**
 * Optional Content parser that converts WordPress <img> tags to Next.js
 * <Image> components for automatic image optimization (WebP/AVIF).
 *
 * Passes intrinsic width/height for aspect ratio and the WP sizes
 * attribute for responsive srcset selection. Images without width/height
 * are skipped (left as native <img>).
 */
export const nextImageParser: CustomParser = (
  node: DOMNode,
  props: ElementProps,
) => {
  const el = node as unknown as { name?: string };
  if (el.name !== 'img') return undefined;

  const p = props as Record<string, unknown>;
  const src = p.src as string;
  if (!src) return undefined;

  const alt = (p.alt as string) || '';
  const className = (p.className as string) || undefined;
  const style = p.style as React.CSSProperties | undefined;
  const width = parseInt(String(p.width || ''), 10) || 0;
  const height = parseInt(String(p.height || ''), 10) || 0;
  const sizes = typeof p.sizes === 'string' ? p.sizes : undefined;

  // Skip images without intrinsic dimensions — can't optimize without them
  if (!width || !height) return undefined;

  // Collect data-* attributes
  const dataAttrs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(p)) {
    if (key.startsWith('data-')) {
      dataAttrs[key] = value;
    }
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      style={style}
      {...dataAttrs}
    />
  );
};
