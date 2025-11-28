import { withWCR } from 'nextpress/withWCR';

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  env: {
    GRAPHQL_ENDPOINT: 'http://localhost:8080/wp/graphql',
  }
};

const wpDomain = 'localhost:8080';
const wpProtocol = 'http';

export default withWCR(nextConfig, {
  wpDomain,
  wpProtocol,
  wpHomeUrl: `${wpProtocol}://${wpDomain}`,
  wpSiteUrl: `${wpProtocol}://${wpDomain}/wp`,
  frontendDomain: 'localhost:3000',
  frontendProtocol: 'http',
});