<?php
/**
 * Class CORS
 *
 * Handles Cross-Origin Resource Sharing (CORS) for WordPress REST API.
 * Enables Next.js frontends to make API calls to WordPress backend.
 *
 * @package NextPress;
 * @since 0.0.1
 */

namespace NextPress;

/**
 * CORS class.
 *
 * Provides comprehensive CORS support for headless WordPress implementations.
 * Supports all HTTP methods needed for WooCommerce REST API operations.
 */
class CORS {
	/**
	 * Allowed HTTP methods for CORS requests
	 *
	 * @var array
	 */
	private $allowed_methods = array( 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH' );

	/**
	 * Allowed headers for CORS requests
	 *
	 * @var array
	 */
	private $allowed_headers = array(
		'Accept',
		'Accept-Language',
		'Content-Type',
		'Content-Language',
		'Authorization',
		'X-WP-Nonce',
		'X-Requested-With',
		'Cache-Control',
		'woocommerce-session',
	);

	/**
	 * CORS constructor
	 */
	public function __construct() {
		$this->init();
	}

	/**
	 * Initialize CORS functionality
	 *
	 * @return void
	 */
	private function init() {
		// Only initialize if CORS is enabled
		if ( ! $this->is_cors_enabled() ) {
			return;
		}

		// Add CORS headers to REST API responses
		add_filter( 'rest_pre_serve_request', array( $this, 'add_cors_headers' ), 15, 4 );

		// Handle preflight OPTIONS requests
		add_action( 'rest_api_init', array( $this, 'handle_preflight' ), 10 );
	}

	/**
	 * Check if CORS is enabled
	 *
	 * @return bool True if CORS should be enabled.
	 */
	private function is_cors_enabled() {
		$enabled = 'on' === nextpress_get_setting( 'enable_cors', 'off' );

		/**
		 * Filter whether CORS is enabled
		 *
		 * @param bool $enabled Whether CORS is enabled (default: from settings).
		 */
		return apply_filters( 'nextpress_cors_enabled', $enabled );
	}

	/**
	 * Get allowed origins for CORS
	 *
	 * Parses the cors_origins setting which contains newline-separated URLs.
	 *
	 * @return array List of allowed origins.
	 */
	private function get_allowed_origins() {
		$origins = array();

		// Get origins from NextPress settings (textarea with newline-separated URLs)
		$origins_setting = nextpress_get_setting( 'cors_origins', '' );

		if ( ! empty( $origins_setting ) ) {
			// Split by newlines and sanitize
			$origins_array = preg_split( '/\r\n|\r|\n/', $origins_setting );

			foreach ( $origins_array as $origin ) {
				$origin = trim( $origin );

				// Validate URL format
				if ( ! empty( $origin ) && filter_var( $origin, FILTER_VALIDATE_URL ) ) {
					$origins[] = untrailingslashit( $origin );
				}
			}
		}

		/**
		 * Filter allowed CORS origins
		 *
		 * @param array $origins List of allowed origin URLs.
		 */
		$origins = apply_filters( 'nextpress_cors_allowed_origins', $origins );

		// Remove duplicates and empty values
		$origins = array_unique( array_filter( $origins ) );

		return $origins;
	}

	/**
	 * Get the current request origin
	 *
	 * @return string|false The request origin or false if not set.
	 */
	private function get_request_origin() {
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotValidated
		if ( ! isset( $_SERVER['HTTP_ORIGIN'] ) ) {
			return false;
		}

		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$origin = wp_unslash( $_SERVER['HTTP_ORIGIN'] );

		// Validate origin format
		if ( ! filter_var( $origin, FILTER_VALIDATE_URL ) ) {
			return false;
		}

		return untrailingslashit( $origin );
	}

	/**
	 * Check if request origin is allowed
	 *
	 * @param string $origin The request origin to check.
	 * @return bool True if origin is allowed.
	 */
	private function is_origin_allowed( $origin ) {
		if ( empty( $origin ) ) {
			return false;
		}

		$allowed_origins = $this->get_allowed_origins();

		// If no origins configured, allow none
		if ( empty( $allowed_origins ) ) {
			return false;
		}

		// Check if origin matches any allowed origin
		foreach ( $allowed_origins as $allowed_origin ) {
			if ( $origin === $allowed_origin ) {
				return true;
			}
		}

		/**
		 * Filter whether a specific origin is allowed
		 *
		 * @param bool   $allowed Whether the origin is allowed (default: false).
		 * @param string $origin  The origin being checked.
		 */
		return apply_filters( 'nextpress_cors_is_origin_allowed', false, $origin );
	}

	/**
	 * Add CORS headers to REST API response
	 *
	 * @param bool             $served  Whether the request has already been served.
	 * @param mixed            $result  Result to send to the client.
	 * @param \WP_REST_Request $request The REST request object.
	 * @param \WP_REST_Server  $server  The REST server instance.
	 * @return bool Whether the request was served.
	 */
	public function add_cors_headers( $served, $result, $request, $server ) {
		$origin = $this->get_request_origin();

		// Only add headers if origin is allowed
		if ( ! $this->is_origin_allowed( $origin ) ) {
			return $served;
		}

		// Set Access-Control-Allow-Origin to specific origin (not wildcard)
		header( 'Access-Control-Allow-Origin: ' . $origin );

		// Allow credentials (cookies, authorization headers, etc.)
		header( 'Access-Control-Allow-Credentials: true' );

		// Set Vary header to ensure proper caching
		header( 'Vary: Origin', false );

		return $served;
	}

	/**
	 * Handle preflight OPTIONS requests
	 *
	 * Preflight requests are sent by browsers before actual CORS requests
	 * to check if the server allows the cross-origin request.
	 *
	 * @return void
	 */
	public function handle_preflight() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( 'OPTIONS' !== $_SERVER['REQUEST_METHOD'] ) {
			return;
		}

		$origin = $this->get_request_origin();

		// Only handle preflight for allowed origins
		if ( ! $this->is_origin_allowed( $origin ) ) {
			return;
		}

		// Set Access-Control-Allow-Origin to specific origin
		header( 'Access-Control-Allow-Origin: ' . $origin );

		// Allow credentials
		header( 'Access-Control-Allow-Credentials: true' );

		// Set allowed methods
		header( 'Access-Control-Allow-Methods: ' . implode( ', ', $this->allowed_methods ) );

		// Set allowed headers
		$allowed_headers = $this->allowed_headers;

		/**
		 * Filter allowed CORS headers
		 *
		 * @param array $allowed_headers List of allowed headers.
		 */
		$allowed_headers = apply_filters( 'nextpress_cors_allowed_headers', $allowed_headers );

		header( 'Access-Control-Allow-Headers: ' . implode( ', ', $allowed_headers ) );

		// Set max age for preflight cache (24 hours)
		header( 'Access-Control-Max-Age: 86400' );

		// Set Vary header
		header( 'Vary: Origin', false );

		// Return 200 OK for preflight
		status_header( 200 );
		exit;
	}
}
