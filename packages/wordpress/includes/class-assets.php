<?php
/**
 * Manages script and stylesheet assets for headless WordPress.
 *
 * @package NextPress
 */

namespace NextPress;

/**
 * Class Assets
 *
 * Handles custom script replacements for headless WordPress environments,
 * ensuring proper nonce handling and API routing through Next.js middleware.
 */
class Assets {

	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'replace_wp_api_fetch' ), 20 );

		// Intercept URL functions during wc-settings generation (frontend/GraphQL only)
		// Main wcSettings object generated at priority 1 on wp_print_footer_scripts
		add_action( 'wp_print_footer_scripts', array( $this, 'start_url_transforms' ), 0 );
		add_action( 'wp_print_footer_scripts', array( $this, 'stop_url_transforms' ), 2 );

		// Intercept URL functions when blocks enqueue data
		add_action( 'woocommerce_blocks_checkout_enqueue_data', array( $this, 'start_url_transforms_for_blocks' ), 9 );
		add_action( 'woocommerce_blocks_checkout_enqueue_data', array( $this, 'stop_url_transforms_for_blocks' ), 999 );
		add_action( 'woocommerce_blocks_cart_enqueue_data', array( $this, 'start_url_transforms_for_blocks' ), 9 );
		add_action( 'woocommerce_blocks_cart_enqueue_data', array( $this, 'stop_url_transforms_for_blocks' ), 999 );

		add_filter( 'woocommerce_store_api_disable_nonce_check', array( $this, 'disable_wc_nonce_check' ) );

		add_filter( 'nextpress/graphql/uri-assets/skip_script_module_dependency', array( $this, 'skip_unbootstrapped_wc_handles' ), 10, 4 );

		// Transform WooCommerce Stripe Gateway Express Checkout params
		add_filter( 'wc_stripe_express_checkout_params', array( $this, 'transform_stripe_express_checkout_params' ) );
		add_filter( 'wc_stripe_upe_params', array( $this, 'transform_stripe_express_checkout_params' ) );

		// Transform WC AJAX endpoint URLs to use the WC proxy route
		add_filter( 'woocommerce_ajax_get_endpoint', array( $this, 'transform_wc_ajax_endpoint' ), 10, 2 );

		// Transform WooCommerce return URL (order-received page) for headless
		add_filter( 'woocommerce_get_return_url', array( $this, 'transform_return_url' ), 10 );

		// Ensure the cart URL is transformed for headless environments
		add_filter( 'woocommerce_get_cart_url', array( $this, 'transform_cart_url' ), 10 );

		// Allow WC block scripts to enqueue during asset simulation
		add_action( 'nextpress_pre_simulate_render', array( $this, 'disable_wc_rest_api_filter_for_simulation' ) );
		add_action( 'nextpress_post_simulate_render', array( $this, 'restore_wc_rest_api_filter_after_simulation' ) );
	}

	/**
	 * Replace core wp-api-fetch with custom headless version
	 *
	 * Only runs during GraphQL requests when the setting is enabled.
	 * Dequeues the WordPress core wp-api-fetch script and replaces it
	 * with NextPress custom version that's pre-configured for headless
	 * environments with correct proxy URL and fresh nonces.
	 *
	 * @return void
	 */
	public function replace_wp_api_fetch() {
		// Check if feature is enabled via settings
		$settings   = get_option( 'nextpress_headless_settings', array() );
		$is_enabled = isset( $settings['enable_custom_api_fetch'] )
			&& $settings['enable_custom_api_fetch'] === 'on';

		if ( ! $is_enabled ) {
			return;
		}

		// Only for GraphQL requests
		if ( ! function_exists( 'is_graphql_request' ) || ! is_graphql_request() ) {
			return;
		}

		// Dequeue and deregister core wp-api-fetch
		wp_dequeue_script( 'wp-api-fetch' );
		wp_deregister_script( 'wp-api-fetch' );

		// Register our custom version
		wp_register_script(
			'wp-api-fetch',
			plugins_url( 'assets/dist/wp-api-fetch.js', dirname( __FILE__ ) ),
			array( 'wp-hooks' ), // Same dependency as core
			NEXTPRESS_VERSION,
			false // Load in header
		);

		// Localize with nonce only
		// Note: rootURL and nonceEndpoint are injected by HeadScripts.tsx with instance slug
		wp_localize_script(
			'wp-api-fetch',
			'wpApiSettings',
			array(
				'nonce' => wp_create_nonce( 'wp_rest' ), // Fresh nonce with user context
			)
		);

		// Enqueue the custom script
		wp_enqueue_script( 'wp-api-fetch' );
	}

	/**
	 * Start transforming URL functions to use proxy placeholders
	 *
	 * Called at priority 0 on wp_print_footer_scripts, before WooCommerce
	 * generates the main wc-settings data at priority 1.
	 *
	 * Uses two placeholder types:
	 * 1. __NEXTPRESS_PROXY__ for page URLs (home_url) → replaced with frontend origin
	 * 2. __NEXTPRESS_ASSETS__ for asset URLs (plugins_url, site_url, attachments) → replaced with proxy route
	 *
	 * @return void
	 */
	public function start_url_transforms() {
		// Check if feature is enabled via settings
		$settings   = get_option( 'nextpress_headless_settings', array() );
		$is_enabled = isset( $settings['enable_custom_wc_scripts'] )
			&& $settings['enable_custom_wc_scripts'] === 'on';

		if ( ! $is_enabled ) {
			return;
		}

		// Only for GraphQL requests
		if ( ! function_exists( 'is_graphql_request' ) || ! is_graphql_request() ) {
			return;
		}

		// Add filters to transform URL function calls
		add_filter( 'home_url', array( $this, 'transform_home_url_to_proxy' ), 10, 4 );
		add_filter( 'plugins_url', array( $this, 'transform_plugins_url_to_proxy' ), 10, 3 );
		add_filter( 'site_url', array( $this, 'transform_site_url_to_proxy' ), 10, 4 );
		add_filter( 'wp_get_attachment_url', array( $this, 'transform_attachment_url_to_proxy' ), 10, 2 );
	}

	/**
	 * Stop transforming URL functions
	 *
	 * Called at priority 2 on wp_print_footer_scripts, after WooCommerce
	 * generates wc-settings data at priority 1.
	 *
	 * @return void
	 */
	public function stop_url_transforms() {
		// Remove the filters
		remove_filter( 'home_url', array( $this, 'transform_home_url_to_proxy' ), 10 );
		remove_filter( 'plugins_url', array( $this, 'transform_plugins_url_to_proxy' ), 10 );
		remove_filter( 'site_url', array( $this, 'transform_site_url_to_proxy' ), 10 );
		remove_filter( 'wp_get_attachment_url', array( $this, 'transform_attachment_url_to_proxy' ), 10 );
	}

	/**
	 * Start transforming URL functions for WooCommerce Blocks
	 *
	 * Called at priority 9 on wp_enqueue_scripts, before blocks register their
	 * scripts at priority 10+ and call enqueue_data() which adds wcBlocksConfig.
	 *
	 * @return void
	 */
	public function start_url_transforms_for_blocks() {
		// Check if feature is enabled via settings
		$settings   = get_option( 'nextpress_headless_settings', array() );
		$is_enabled = isset( $settings['enable_custom_wc_scripts'] )
			&& $settings['enable_custom_wc_scripts'] === 'on';

		if ( ! $is_enabled ) {
			return;
		}

		// Only for GraphQL requests
		if ( ! function_exists( 'is_graphql_request' ) || ! is_graphql_request() ) {
			return;
		}

		// Add filters to transform URL function calls
		add_filter( 'home_url', array( $this, 'transform_home_url_to_proxy' ), 10, 4 );
		add_filter( 'plugins_url', array( $this, 'transform_plugins_url_to_proxy' ), 10, 3 );
		add_filter( 'site_url', array( $this, 'transform_site_url_to_proxy' ), 10, 4 );
		add_filter( 'wp_get_attachment_url', array( $this, 'transform_attachment_url_to_proxy' ), 10, 2 );
		add_filter( 'woocommerce_get_cart_url', array( $this, 'transform_home_url_to_proxy' ), 10, 2 );

	}

	/**
	 * Stop transforming URL functions for WooCommerce Blocks
	 *
	 * Called at priority 999 on wp_enqueue_scripts, after all blocks and payment
	 * gateways have finished registering scripts and adding data.
	 *
	 * @return void
	 */
	public function stop_url_transforms_for_blocks() {
		// Remove the filters
		remove_filter( 'home_url', array( $this, 'transform_home_url_to_proxy' ), 10 );
		remove_filter( 'plugins_url', array( $this, 'transform_plugins_url_to_proxy' ), 10 );
		remove_filter( 'site_url', array( $this, 'transform_site_url_to_proxy' ), 10 );
		remove_filter( 'wp_get_attachment_url', array( $this, 'transform_attachment_url_to_proxy' ), 10 );
	}

	/**
	 * Transform home_url() to return proxy placeholder
	 *
	 * Filters the home URL to replace WordPress domain with a placeholder
	 * that will be replaced client-side with the frontend origin.
	 *
	 * Returns full URL with scheme to work correctly with WordPress's esc_url() function.
	 *
	 * @param string      $url         The complete home URL including scheme and path.
	 * @param string      $path        Path relative to the home URL.
	 * @param string|null $orig_scheme Scheme to give the home URL context.
	 * @param int|null    $blog_id     Site ID, or null for the current site.
	 * @return string The proxy placeholder URL with scheme and path preserved.
	 */
	public function transform_home_url_to_proxy( $url, $path, $orig_scheme, $blog_id ) {
		$parsed = wp_parse_url( $url );
		$scheme = isset( $parsed['scheme'] ) ? $parsed['scheme'] : 'http';

		// Ensure path has leading slash
		if ( ! empty( $path ) && substr( $path, 0, 1 ) !== '/' ) {
			$path = '/' . $path;
		}

		// e.g., home_url('/cart/') becomes 'http://__NEXTPRESS_PROXY__/cart/'
		return $scheme . '://__NEXTPRESS_PROXY__' . $path;
	}

	/**
	 * Transform plugins_url() to return assets placeholder
	 *
	 * Filters the plugins URL to replace WordPress domain with a placeholder
	 * that will be replaced client-side with the proxy route base.
	 *
	 * Returns full URL with scheme to work correctly with WordPress's esc_url() function.
	 *
	 * @param string $url    The complete URL to the plugins directory including scheme and path.
	 * @param string $path   Path relative to the plugins URL.
	 * @param string $plugin The plugin file path to be relative to.
	 * @return string The assets placeholder URL with scheme and path preserved.
	 */
	public function transform_plugins_url_to_proxy( $url, $path, $plugin ) {
		$parsed = wp_parse_url( $url );
		$scheme = isset( $parsed['scheme'] ) ? $parsed['scheme'] : 'http';
		$full_path = isset( $parsed['path'] ) ? $parsed['path'] : '';
		// e.g., plugins_url('/woocommerce/assets/js/script.js') becomes 'http://__NEXTPRESS_ASSETS__/wp-content/plugins/woocommerce/assets/js/script.js'
		return $scheme . '://__NEXTPRESS_ASSETS__' . $full_path;
	}

	/**
	 * Transform site_url() to return assets placeholder
	 *
	 * Filters the site URL to replace WordPress domain with a placeholder
	 * that will be replaced client-side with the proxy route base.
	 *
	 * Returns full URL with scheme to work correctly with WordPress's esc_url() function.
	 *
	 * @param string      $url         The complete site URL including scheme and path.
	 * @param string      $path        Path relative to the site URL.
	 * @param string|null $orig_scheme Scheme to give the site URL context.
	 * @param int|null    $blog_id     Site ID, or null for the current site.
	 * @return string The assets placeholder URL with scheme and path preserved.
	 */
	public function transform_site_url_to_proxy( $url, $path, $orig_scheme, $blog_id ) {
		$parsed = wp_parse_url( $url );
		$scheme = isset( $parsed['scheme'] ) ? $parsed['scheme'] : 'http';

		// Ensure path has leading slash
		if ( ! empty( $path ) && substr( $path, 0, 1 ) !== '/' ) {
			$path = '/' . $path;
		}

		// e.g., site_url('/wp-login.php') becomes 'http://__NEXTPRESS_ASSETS__/wp-login.php'
		return $scheme . '://__NEXTPRESS_ASSETS__' . $path;
	}

	/**
	 * Transform wp_get_attachment_url() to return assets placeholder
	 *
	 * Filters attachment URLs (media library uploads) to replace WordPress domain
	 * with a placeholder that will be replaced client-side with the proxy route base.
	 *
	 * Returns full URL with scheme to work correctly with WordPress's esc_url() function.
	 *
	 * @param string $url           The attachment URL.
	 * @param int    $attachment_id The attachment post ID.
	 * @return string The assets placeholder URL with scheme and path preserved.
	 */
	public function transform_attachment_url_to_proxy( $url, $attachment_id ) {
		$parsed = wp_parse_url( $url );
		$scheme = isset( $parsed['scheme'] ) ? $parsed['scheme'] : 'http';
		$full_path = isset( $parsed['path'] ) ? $parsed['path'] : '';

		// e.g., wp_get_attachment_url() becomes 'http://__NEXTPRESS_ASSETS__/wp-content/uploads/...'
		return $scheme . '://__NEXTPRESS_ASSETS__' . $full_path;
	}

	/**
	 * Disable WooCommerce Store API nonce check for headless environments
	 *
	 * When WooCommerce script replacement is enabled, disable the nonce check
	 * since we handle security at the proxy layer. This allows the Store API
	 * to work properly in headless setups.
	 *
	 * @return bool True to disable nonce check when enabled
	 */
	public function disable_wc_nonce_check() {
		// Check if feature is enabled via settings
		$settings   = get_option( 'nextpress_headless_settings', array() );
		$is_enabled = isset( $settings['enable_custom_wc_scripts'] )
			&& $settings['enable_custom_wc_scripts'] === 'on';

		return $is_enabled;
	}

	/**
	 * Skip enqueued script handles whose runtime depends on Store API
	 * extension data that only registers when the upstream plugin's TOS
	 * / connection flow has run.
	 *
	 * `woocommerce-services-store-notices` reads
	 * `cart.extensions["woocommerce-services"].notices` and crashes when
	 * the key is missing. WC Services only registers that extension if
	 * `tos_accepted` is true inside `WC_Connect_Loader::after_wc_init`,
	 * so when TOS hasn't been accepted the script loads with no data to
	 * read.
	 *
	 * @param string|false     $handle               Current handle being walked.
	 * @param array            $queue                The flatten queue.
	 * @param \WP_Dependencies $wp_assets            Active assets registry.
	 * @param bool             $check_script_modules Whether modules are being walked.
	 * @return string|false The handle, or false to drop it from the asset list.
	 */
	public function skip_unbootstrapped_wc_handles( $handle, $queue, $wp_assets, $check_script_modules ) {
		$settings   = get_option( 'nextpress_headless_settings', array() );
		$is_enabled = isset( $settings['enable_custom_wc_scripts'] )
			&& $settings['enable_custom_wc_scripts'] === 'on';

		if ( ! $is_enabled ) {
			return $handle;
		}

		if ( 'woocommerce-services-store-notices' === $handle && ! $this->wc_services_tos_accepted() ) {
			return false;
		}

		return $handle;
	}

	/**
	 * Read the WC Services TOS-accepted flag.
	 *
	 * Prefers the upstream `WC_Connect_Options` accessor when WCS is
	 * loaded; falls back to reading the underlying `wc_connect_options`
	 * grouped option directly so this works even if WCS hasn't booted
	 * far enough to expose its class.
	 *
	 * @return bool
	 */
	protected function wc_services_tos_accepted(): bool {
		if ( class_exists( 'WC_Connect_Options' ) ) {
			return (bool) \WC_Connect_Options::get_option( 'tos_accepted' );
		}

		$options = get_option( 'wc_connect_options' );
		if ( is_array( $options ) && ! empty( $options['tos_accepted'] ) ) {
			return true;
		}

		return (bool) get_option( 'wc_connect_tos_accepted', false );
	}

	/**
	 * Transform WC AJAX endpoint URLs to use the WC proxy route.
	 *
	 * WC_AJAX::get_endpoint() appends ?wc-ajax= after home_url() returns,
	 * so the home_url filter never sees the wc-ajax param. This filter
	 * rewrites __NEXTPRESS_PROXY__ to __NEXTPRESS_ASSETS__/wc for routing.
	 *
	 * @param string $url     The WC AJAX endpoint URL.
	 * @param string $request The AJAX request name.
	 * @return string Transformed URL.
	 */
	public function transform_wc_ajax_endpoint( $url, $request ) {
		if ( strpos( $url, '__NEXTPRESS_PROXY__' ) === false ) {
			return $url;
		}

		return str_replace( '__NEXTPRESS_PROXY__/', '__NEXTPRESS_ASSETS__/wc', $url );
	}

	/**
	 * Transform WooCommerce Stripe Express Checkout params for headless environments
	 *
	 * Replaces WordPress URLs in the params with placeholder values that will be
	 * replaced client-side with the appropriate frontend URLs.
	 *
	 * Uses two placeholder types:
	 * 1. __NEXTPRESS_PROXY__ for page URLs (checkout URL, ajax_url, etc.) → replaced with frontend origin
	 * 2. __NEXTPRESS_ASSETS__ for asset URLs (wp-content, wp-includes) → replaced with proxy route
	 *
	 * @param array $params The Express Checkout params array.
	 * @return array Modified params with placeholder URLs.
	 */
	public function transform_stripe_express_checkout_params( $params ) {
		// Check if feature is enabled via settings
		$settings   = get_option( 'nextpress_headless_settings', array() );
		$is_enabled = isset( $settings['enable_stripe_url_transforms'] )
			&& $settings['enable_stripe_url_transforms'] === 'on';

		if ( ! $is_enabled ) {
			return $params;
		}

		// Only for GraphQL requests
		if ( ! function_exists( 'is_graphql_request' ) || ! is_graphql_request() ) {
			return $params;
		}

		// Get the real WordPress home URL (bypassing any filters)
		$home_url = get_option( 'home' );
		$site_url = get_option( 'siteurl' );

		// Recursively transform URLs in the params array
		return $this->transform_stripe_params_urls( $params, $home_url, $site_url );
	}

	/**
	 * Recursively transforms URLs in Stripe params
	 *
	 * @param mixed  $value    The value to transform (can be array, string, or other).
	 * @param string $home_url The WordPress home URL.
	 * @param string $site_url The WordPress site URL.
	 * @return mixed Transformed value with placeholder URLs.
	 */
	private function transform_stripe_params_urls( $value, $home_url, $site_url ) {
		if ( \is_array( $value ) ) {
			$result = array();
			foreach ( $value as $key => $item ) {
				$result[ $key ] = $this->transform_stripe_params_urls( $item, $home_url, $site_url );
			}
			return $result;
		}

		if ( \is_string( $value ) ) {
			// Parse URLs to get hosts/paths for comparison.
			$home_parsed = wp_parse_url( $home_url );
			$site_parsed = wp_parse_url( $site_url );

			$home_host = isset( $home_parsed['host'] ) ? $home_parsed['host'] : '';
			$site_host = isset( $site_parsed['host'] ) ? $site_parsed['host'] : '';

			// site_url's path is the WordPress install subdirectory
			// (e.g. `/wp` on a Bedrock setup, empty on a root install).
			// We strip it so the emitted placeholder path is always relative
			// to the WP root — installation-agnostic.
			$site_path = isset( $site_parsed['path'] ) ? rtrim( $site_parsed['path'], '/' ) : '';

			$parsed = wp_parse_url( $value );

			if ( ! isset( $parsed['host'] ) ) {
				return $value;
			}

			$is_site_url = ( $parsed['host'] === $site_host );
			$is_home_url = ( $parsed['host'] === $home_host );

			if ( ! $is_site_url && ! $is_home_url ) {
				return $value;
			}

			$path         = isset( $parsed['path'] ) ? $parsed['path'] : '';
			$query_string = isset( $parsed['query'] ) ? $parsed['query'] : '';

			// Normalize path: when targeting site_url, strip the install
			// subdirectory so $path is relative to the WP root.
			if ( $is_site_url && '' !== $site_path && 0 === strpos( $path, $site_path . '/' ) ) {
				$path = substr( $path, strlen( $site_path ) );
			}

			$scheme = isset( $parsed['scheme'] ) ? $parsed['scheme'] : 'http';
			$query  = '' !== $query_string ? '?' . $query_string : '';

			// Map the WP URL to the appropriate proxy route alias inside the
			// __NEXTPRESS_ASSETS__ placeholder. Client-side replacement just
			// swaps the placeholder host for `/atx/<instance>` — no path
			// rewriting needed on that side.

			// wc-ajax — identified by `wc-ajax=` in the query. Routes to the
			// `/wc` proxy alias which fetches `${wpHomeUrl}/?<query>` with
			// proper method/headers/body forwarding.
			if ( '' !== $query_string && preg_match( '/(?:^|&)wc-ajax=/', $query_string ) ) {
				return "{$scheme}://__NEXTPRESS_ASSETS__/wc{$query}";
			}

			// admin-ajax.php — routes to the `/wp` proxy alias which fetches
			// `${wpSiteUrl}/wp-admin/admin-ajax.php` with body forwarding
			// (needed for AJAX POSTs).
			if ( preg_match( '#/wp-admin/admin-ajax\.php$#', $path ) ) {
				return "{$scheme}://__NEXTPRESS_ASSETS__/wp{$query}";
			}

			// wp-admin / wp-includes static assets — route through
			// `/wp-internal-assets` which rewrites to `${wpSiteUrl}/<path>`.
			if ( preg_match( '#^/wp-(?:admin|includes)/#', $path ) ) {
				return "{$scheme}://__NEXTPRESS_ASSETS__/wp-internal-assets{$path}{$query}";
			}

			// wp-content assets — route through `/wp-assets` which rewrites
			// to `${wpHomeUrl}/<path>`.
			if ( preg_match( '#^/wp-content/#', $path ) ) {
				return "{$scheme}://__NEXTPRESS_ASSETS__/wp-assets{$path}{$query}";
			}

			// REST API — route through the wp-json proxy.
			if ( preg_match( '#^/wp-json/#', $path ) ) {
				return "{$scheme}://__NEXTPRESS_ASSETS__{$path}{$query}";
			}

			// Anything else — public-facing page URL on home_url.
			return "{$scheme}://__NEXTPRESS_PROXY__{$path}{$query}";
		}

		// Return non-string, non-array values unchanged
		return $value;
	}

	/**
	 * Transform WooCommerce return URL (order-received page) for headless environments
	 *
	 * Converts the absolute WordPress URL to a relative path so the browser
	 * redirects relative to the current origin (the Next.js frontend).
	 *
	 * @param string   $return_url The return URL.
	 * @return string Relative path for the return URL.
	 */
	public function transform_return_url( $return_url ) {
		// Check if feature is enabled via settings
		$settings   = get_option( 'nextpress_headless_settings', array() );
		$is_enabled = isset( $settings['enable_stripe_url_transforms'] )
			&& $settings['enable_stripe_url_transforms'] === 'on';

		if ( ! $is_enabled ) {
			return $return_url;
		}

		// Get the real WordPress home URL
		$home_url = get_option( 'home' );

		// Parse the return URL
		$parsed = wp_parse_url( $return_url );
		$home_parsed = wp_parse_url( $home_url );

		if ( ! isset( $parsed['host'] ) || ! isset( $home_parsed['host'] ) ) {
			return $return_url;
		}

		// Check if the return URL is from our WordPress installation
		if ( $parsed['host'] !== $home_parsed['host'] ) {
			return $return_url;
		}

		// Build relative path
		$path = isset( $parsed['path'] ) ? $parsed['path'] : '/';
		$query = isset( $parsed['query'] ) ? '?' . $parsed['query'] : '';

		// Return relative path (browser will use current origin)
		return $path . $query;
	}

	/**
	 * Transform woocommerce_get_cart_url to use proxy placeholder.
	 *
	 * Replaces the absolute WordPress cart URL with a __NEXTPRESS_PROXY__
	 * placeholder so the headless frontend can resolve it relative to
	 * its own origin.
	 *
	 * @param string $url The cart URL.
	 * @return string The transformed URL with proxy placeholder.
	 */
	public function transform_cart_url( $url ) {
		$settings   = get_option( 'nextpress_headless_settings', array() );
		$is_enabled = isset( $settings['enable_stripe_url_transforms'] )
			&& $settings['enable_stripe_url_transforms'] === 'on';

		if ( ! $is_enabled ) {
			return $url;
		}

		$home_url    = get_option( 'home' );
		$home_parsed = wp_parse_url( $home_url );
		$url_parsed  = wp_parse_url( $url );

		if ( ! isset( $url_parsed['host'] ) || ! isset( $home_parsed['host'] ) ) {
			return $url;
		}

		if ( $url_parsed['host'] !== $home_parsed['host'] ) {
			return $url;
		}

		$scheme = isset( $url_parsed['scheme'] ) ? $url_parsed['scheme'] : 'http';
		$path   = isset( $url_parsed['path'] ) ? $url_parsed['path'] : '/';
		$query  = isset( $url_parsed['query'] ) ? '?' . $url_parsed['query'] : '';

		return $scheme . '://__NEXTPRESS_PROXY__' . $path . $query;
	}

	public function disable_wc_rest_api_filter_for_simulation() {
		$settings   = get_option( 'nextpress_headless_settings', array() );
		$is_enabled = isset( $settings['enable_custom_wc_scripts'] )
			&& $settings['enable_custom_wc_scripts'] === 'on';

		if ( ! $is_enabled ) {
			return;
		}

		remove_filter( 'woocommerce_is_rest_api_request', '__return_true' );
		add_filter( 'woocommerce_is_rest_api_request', '__return_false', 999 );
	}

	public function restore_wc_rest_api_filter_after_simulation() {
		$settings   = get_option( 'nextpress_headless_settings', array() );
		$is_enabled = isset( $settings['enable_custom_wc_scripts'] )
			&& $settings['enable_custom_wc_scripts'] === 'on';

		if ( ! $is_enabled ) {
			return;
		}

		remove_filter( 'woocommerce_is_rest_api_request', '__return_false', 999 );
		if ( function_exists( 'is_graphql_http_request' ) && is_graphql_http_request() ) {
			add_filter( 'woocommerce_is_rest_api_request', '__return_true' );
		}
	}
}
