import { NextConfig } from 'next';

type WPConfig = {
  wpDomain: string;
  wpProtocol: string;
  wpHomeUrl?: string;
  wpSiteUrl?: string;
}

type WCROptions = {
  frontendDomain: string;
  frontendProtocol: string;
  defaultInstance?: string;
  formatPermalinks?: boolean;
  salt?: string;
}

type MultiWPConfig = Record<string, WPConfig>;

/**
 * Detects if config is single instance (legacy) or multi-instance
 */
function isSingleInstance(config: WPConfig | MultiWPConfig): config is WPConfig {
  return 'wpDomain' in config && 'wpProtocol' in config;
}

/**
 * withWCR Next.js plugin
 * Configures WordPress backend(s) for NextPress
 *
 * @param config - Next.js configuration
 * @param wpConfig - Single WPConfig (legacy) or Record<string, WPConfig> for multi-instance
 * @param options - Frontend configuration options
 */
export function withWCR(
  config: NextConfig,
  wpConfig: WPConfig | MultiWPConfig,
  options: WCROptions
) {
  const { frontendDomain, frontendProtocol, formatPermalinks = true, salt = 'nextpress-default-salt' } = options;

  // Handle single instance (legacy support - convert to multi-instance with 'default' slug)
  let instances: MultiWPConfig;
  if (isSingleInstance(wpConfig)) {
    instances = { default: wpConfig };
  } else {
    instances = wpConfig;
  }

  // Normalize each instance config
  const normalizedInstances: MultiWPConfig = {};
  for (const [slug, instance] of Object.entries(instances)) {
    const wpHomeUrl = instance.wpHomeUrl || `${instance.wpProtocol}://${instance.wpDomain}`;
    const wpSiteUrl = instance.wpSiteUrl || wpHomeUrl;
    normalizedInstances[slug] = {
      ...instance,
      wpHomeUrl,
      wpSiteUrl,
    };
  }

  // Redirect type matching Next.js Redirect
  type Redirect = {
    source: string;
    destination: string;
    permanent: boolean;
    has?: Array<{ type: 'query'; key: string }>;
  };

  // Generate redirects for each WordPress instance
  const generateRedirects = (): Redirect[] => {
    const allRedirects: Redirect[] = [];

    for (const [slug] of Object.entries(normalizedInstances)) {
      // WooCommerce AJAX redirect
      allRedirects.push({
        source: `/${slug}`,
        has: [
          {
            type: "query" as "query",
            key: 'wc-ajax',
          },
        ],
        permanent: false,
        destination: `/atx/${slug}/wc`,
      });

      // WordPress AJAX redirect
      allRedirects.push({
        source: `/${slug}`,
        has: [
          {
            type: "query" as "query",
            key: 'wp-ajax',
          },
        ],
        permanent: false,
        destination: `/atx/${slug}/wp`,
      });
    }

    return allRedirects;
  };

  // Inject WordPress instances into process.env (server-side only)
  // This works with both Webpack and Turbopack, and both Node.js and Edge runtimes
  // Important: NOT added to config.env to keep it server-side only
  process.env.NEXTPRESS_WP_INSTANCES = JSON.stringify(normalizedInstances);
  process.env.NEXTPRESS_FORMAT_PERMALINKS = formatPermalinks.toString();
  process.env.NEXTPRESS_SALT = salt;

  const newConfig = {
    ...config,
    env: {
      ...config.env,
      // Frontend URL is public and needed client-side for URL construction
      wcr_frontend_url: `${frontendProtocol}://${frontendDomain}`,
      // Salt is needed client-side for decoding backend URL
      wcr_salt: salt,
      // NOTE: NEXTPRESS_WP_INSTANCES is set on process.env above (server-side only)
      // It is intentionally NOT added here to prevent client-side exposure
    },
    redirects: async () => {
      const wordpressContentRenderRedirects = generateRedirects();

      const redirects = await config.redirects?.()
      if (!redirects) {
        return wordpressContentRenderRedirects;
      } else if (Array.isArray(redirects)) {
        return redirects.concat(wordpressContentRenderRedirects)
      } else {
        throw new Error("Invalid return type for NextJS configuration redirects callback");
      }
    },
  };

  return newConfig;
}
