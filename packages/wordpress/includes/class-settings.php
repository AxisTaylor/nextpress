<?php
/**
 * Initializes the NextPress Settings page.
 *
 * @package NextPress
 */

namespace NextPress;

/**
 * Class Settings
 */
class Settings {

	/**
	 * Settings_Registry instance
	 *
	 * @var Settings_Registry
	 */
	public $settings_api;

	/**
	 * Initialize the NextPress Settings Pages
	 *
	 * @return void
	 */
	public function init() {
		$this->settings_api = new Settings_Registry();
		add_action( 'admin_menu', array( $this, 'add_options_page' ) );
		add_action( 'init', array( $this, 'register_settings' ) );
		add_action( 'admin_init', array( $this, 'initialize_settings_page' ) );
	}

	/**
	 * Add the options page to the WP Admin
	 *
	 * @return void
	 */
	public function add_options_page() {
		add_options_page(
			__( 'NextPress Settings', 'nextpress' ),
			__( 'NextPress', 'nextpress' ),
			'manage_options',
			'nextpress-settings',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Registers the initial settings for NextPress
	 *
	 * @return void
	 */
	public function register_settings() {
		// Register CORS Settings Section
		$this->settings_api->register_section(
			'nextpress_cors_settings',
			array(
				'title' => __( 'CORS Settings', 'nextpress' ),
				'desc'  => __( 'Configure Cross-Origin Resource Sharing (CORS) for headless WordPress implementations. These settings allow your Next.js frontend to communicate with the WordPress REST API.', 'nextpress' ),
			)
		);

		$this->settings_api->register_fields(
			'nextpress_cors_settings',
			array(
				array(
					'name'    => 'enable_cors',
					'label'   => __( 'Enable CORS', 'nextpress' ),
					'desc'    => __( 'Enable Cross-Origin Resource Sharing for REST API requests', 'nextpress' ),
					'type'    => 'checkbox',
					'default' => 'off',
				),
				array(
					'name'        => 'cors_origins',
					'label'       => __( 'Allowed Origins', 'nextpress' ),
					'desc'        => __( 'Enter allowed origin URLs (one per line). Example: https://mysite.com', 'nextpress' ),
					'type'        => 'textarea',
					'default'     => '',
					'placeholder' => "https://example.com\nhttps://www.example.com",
				),
			)
		);

		// Register Headless Settings Section
		$this->settings_api->register_section(
			'nextpress_headless_settings',
			array(
				'title' => __( 'Headless Settings', 'nextpress' ),
				'desc'  => __( 'Configure NextPress behavior for headless WordPress implementations.', 'nextpress' ),
			)
		);

		$headless_fields = array(
			array(
				'name'    => 'enable_custom_api_fetch',
				'label'   => __( 'Replace wp-api-fetch Script', 'nextpress' ),
				'desc'    => __( 'Replace WordPress core wp-api-fetch script with NextPress custom version designed for headless environments. This ensures proper nonce handling and API routing through your Next.js proxy. Disable if you experience conflicts with other plugins.', 'nextpress' ),
				'type'    => 'checkbox',
				'default' => 'on',
			),
		);

		// Add WooCommerce field only if WooCommerce is active
		if ( class_exists( 'WooCommerce' ) ) {
			$headless_fields[] = array(
				'name'    => 'enable_custom_wc_scripts',
				'label'   => __( 'Replace WooCommerce Scripts', 'nextpress' ),
				'desc'    => __( 'Replace WooCommerce scripts with NextPress custom versions that use fresh nonces for headless environments. This fixes stale nonce issues with WooCommerce Store API (cart, checkout). Disable if you experience conflicts.', 'nextpress' ),
				'type'    => 'checkbox',
				'default' => 'on',
			);

			// Add Stripe Gateway field only if WooCommerce Stripe Gateway is active
			if ( class_exists( 'WC_Stripe' ) ) {
				$headless_fields[] = array(
					'name'    => 'enable_stripe_url_transforms',
					'label'   => __( 'Transform Stripe Gateway URLs', 'nextpress' ),
					'desc'    => __( 'Transform WooCommerce Stripe Gateway URLs (Express Checkout, Payment Request) to use NextPress proxy placeholders. Required for Stripe payments to work correctly in headless environments.', 'nextpress' ),
					'type'    => 'checkbox',
					'default' => 'on',
				);
			}
		}

		$this->settings_api->register_fields(
			'nextpress_headless_settings',
			$headless_fields
		);

		// Action to hook into to register additional settings.
		do_action( 'nextpress_register_settings', $this );

	}

	/**
	 * Initialize the settings admin page
	 *
	 * @return void
	 */
	public function initialize_settings_page() {
		$this->settings_api->admin_init();
	}

	/**
	 * Render the settings page in the admin
	 *
	 * @return void
	 */
	public function render_settings_page() {
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'NextPress Settings', 'nextpress' ); ?></h1>
			<?php
			settings_errors();
			$this->settings_api->show_navigation();
			$this->settings_api->show_forms();
			?>
		</div>
		<?php
	}
}
