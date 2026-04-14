import React from 'react';
import Image from 'next/image';
import type { DOMNode } from 'html-react-parser';
import type { CustomParser, ElementProps } from '@axistaylor/nextpress';

/**
 * Custom Content parser that converts WordPress <img> tags to Next.js
 * <Image> components for automatic image optimization (WebP/AVIF,
 * responsive sizing, lazy loading).
 *
 * Passes through all relevant WordPress image attributes while letting
 * next/image handle srcset generation, lazy loading, and decoding.
 */
export const imageParser: CustomParser = (
  node: DOMNode,
  props: ElementProps,
) => {
  const el = node as unknown as { name?: string };
  if (el.name !== 'img') return undefined;

  const p = props as Record<string, unknown>;
  const src = p.src as string;
  if (!src) return undefined;

  const width = parseInt(String(p.width || ''), 10) || 0;
  const height = parseInt(String(p.height || ''), 10) || 0;

  // next/image requires width + height for static images.
  // If missing (rare in WP), use fill mode instead.
  const useFill = !width || !height;

  // Collect data-* attributes to pass through
  const dataAttrs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(p)) {
    if (key.startsWith('data-')) {
      dataAttrs[key] = value;
    }
  }

  // WordPress sets sizes like "(max-width: 1024px) 100vw, 1024px".
  // next/image can use this directly via the sizes prop.
  const sizes = typeof p.sizes === 'string'
    ? p.sizes
    : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px';

  if (useFill) {
    return (
      <Image
        src={src}
        alt={(p.alt as string) || ''}
        fill
        className={p.className as string}
        style={p.style as React.CSSProperties}
        sizes={sizes}
        {...dataAttrs}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={(p.alt as string) || ''}
      width={width}
      height={height}
      className={p.className as string}
      style={p.style as React.CSSProperties}
      sizes={sizes}
      {...dataAttrs}
    />
  );
};
