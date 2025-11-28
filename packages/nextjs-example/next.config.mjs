import { withWCR } from '@axistaylor/nextpress/withWCR';

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
      },
    ],
    minimumCacheTTL: 60,
    disableStaticImages: true,
  },
  env: {
    GRAPHQL_ENDPOINT: 'http://localhost:8080/wp/graphql',
    CHECKOUT_KEY: 'YWRtaW46TGNtNCBIQzJaIHd5ajkgRFJUMiBWeDFkIHdoaDQ=',
  },
};

const wpDomain = 'localhost:8080';
const wpProtocol = 'http';

export default withWCR(
  nextConfig,
  {
    wpDomain,
    wpProtocol,
    wpHomeUrl: `${wpProtocol}://${wpDomain}`,
    wpSiteUrl: `${wpProtocol}://${wpDomain}/wp`,
  },
  {
    frontendDomain: 'localhost:3000',
    frontendProtocol: 'http',
  }
);