/* eslint-disable react/jsx-props-no-spreading */
import { useState } from 'react';
import NextImage from 'next/image';

export type ImageProps = {
  className?: string;
  src: string;
  sizes?: string;
  width?: number;
  height?: number;
  alt: string;
  style?: JSX.IntrinsicElements['img']['style']
  fill?: boolean;
  objectFit?: NonNullable<JSX.IntrinsicElements['img']['style']>['objectFit'];
  priority?: boolean;
}

export function Image(props: ImageProps) {
  const [isLoading, setLoading] = useState(true);

  const {
    className = '',
    src,
    alt,
    sizes,
    width,
    height,
    style,
    fill = true,
    objectFit = 'cover',
    priority = false,
  } = props;

  return (
    <div
      className={`overflow-hidden group ${className ? className : ''}`}
      style={style}
    >
      {isLoading && "Loading..."}
      <NextImage
        fill={fill}
        src={src}
        alt={alt}
        width={width && fill ? undefined : width}
        height={height && fill ? undefined : height}
        style={{ objectFit }}
        sizes={sizes}
        className={`group-hover:opacity-75 duration-700 ease-in-out ${isLoading ? 'grayscale blur-2xl scale-110' : 'grayscale-0 blur-0 scale-100'}`}
        onLoad={() => setLoading(false)}
        priority={priority}
      />
    </div>
  );
}