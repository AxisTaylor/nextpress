<?php
/**
 * Object Type - GlobalStyles
 *
 * Exposes the global theme.json stylesheet, custom CSS, and font face
 * declarations that WordPress normally outputs on every page but are not
 * included in per-page enqueued assets.
 *
 * @package NextPress\Uri_Assets\Type\Object
 * @since TBD
 */

namespace NextPress\Uri_Assets\Type\Object;

class Global_Styles {
	/**
	 * Registers the type and root query field.
	 *
	 * @return void
	 */
	public static function register(): void {
		register_graphql_object_type(
			'GlobalStyles',
			[
				'description' => static function () {
					return __( 'Global WordPress styles from theme.json, custom CSS, and font faces.', 'nextpress' );
				},
				'fields'      => [
					'stylesheet'        => [
						'type'        => 'String',
						'description' => static function () {
							return __( 'The full global stylesheet generated from theme.json (custom properties, presets, block styles, layout styles).', 'nextpress' );
						},
						'resolve'     => static function () {
							return wp_get_global_stylesheet() ?: null;
						},
					],
					'customCss'         => [
						'type'        => 'String',
						'description' => static function () {
							return __( 'Custom CSS from the WordPress Customizer and theme.json styles.css.', 'nextpress' );
						},
						'resolve'     => static function () {
							// Prevent duplicate output if wp_head is called later.
							remove_action( 'wp_head', 'wp_custom_css_cb', 101 );

							$custom_css  = wp_get_custom_css();
							$custom_css .= wp_get_global_stylesheet( [ 'custom-css' ] );

							return ! empty( $custom_css ) ? $custom_css : null;
						},
					],
					'renderedFontFaces' => [
						'type'        => 'String',
						'description' => static function () {
							return __( 'Rendered @font-face CSS declarations from theme.json.', 'nextpress' );
						},
						'resolve'     => static function () {
							if ( ! function_exists( 'wp_print_font_faces' ) ) {
								return null;
							}

							// Check if theme URL transforms are enabled.
							$settings              = get_option( 'nextpress_headless_settings', [] );
							$transform_theme_urls  = isset( $settings['enable_theme_url_transforms'] )
								&& $settings['enable_theme_url_transforms'] === 'on';

							$transform = null;
							if ( $transform_theme_urls ) {
								// Transform theme file URIs to use the NextPress proxy placeholder
								// so the frontend can rewrite them to the proxy route at render time.
								// Internal /wp-includes/ and /wp-admin/ paths route through
								// wp-internal-assets; everything else routes through wp-assets.
								// Skip URLs that already contain the placeholder to avoid double-transforming
								// when WordPress chains multiple URL filters.
								$transform = static function ( $url ) {
									if ( strpos( $url, '__NEXTPRESS_ASSETS__' ) !== false ) {
										return $url;
									}

									$parsed = wp_parse_url( $url );
									if ( empty( $parsed['path'] ) ) {
										return $url;
									}
									$scheme = $parsed['scheme'] ?? 'http';
									$path   = $parsed['path'];
									$prefix = preg_match( '#^/wp-(?:includes|admin)/#', $path )
										? '/wp-internal-assets'
										: '/wp-assets';
									return $scheme . '://__NEXTPRESS_ASSETS__' . $prefix . $path;
								};

								add_filter( 'theme_file_uri', $transform );
								add_filter( 'stylesheet_directory_uri', $transform );
								add_filter( 'template_directory_uri', $transform );

								// WordPress caches theme.json resolved URIs, so we need to
								// clear the cache to get fresh URLs through our filters.
								if ( class_exists( '\WP_Theme_JSON_Resolver' ) && method_exists( '\WP_Theme_JSON_Resolver', 'clean_cached_data' ) ) {
									\WP_Theme_JSON_Resolver::clean_cached_data();
								}
							}

							ob_start();
							wp_print_font_faces();
							$output = ob_get_clean();

							if ( $transform_theme_urls && null !== $transform ) {
								remove_filter( 'theme_file_uri', $transform );
								remove_filter( 'stylesheet_directory_uri', $transform );
								remove_filter( 'template_directory_uri', $transform );
							}

							return ! empty( $output ) ? $output : null;
						},
					],
				],
			]
		);
	}
}
