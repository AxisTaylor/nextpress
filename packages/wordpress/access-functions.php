<?php
/**
 * NextPress Access Functions
 *
 * Global helper functions for accessing NextPress settings and functionality.
 *
 * @package NextPress
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'nextpress_get_setting' ) ) {
	/**
	 * Get a NextPress setting value
	 *
	 * @param string $option_name   The name of the setting option to retrieve.
	 * @param mixed  $default       Default value if setting is not found.
	 * @param string $section_name  The settings section name (default: 'nextpress_cors_settings').
	 *
	 * @return mixed The setting value or default if not found.
	 */
	function nextpress_get_setting( string $option_name, $default = '', $section_name = 'nextpress_cors_settings' ) {
		$section_fields = get_option( $section_name );

		/**
		 * Filter the section fields before retrieving a specific setting
		 *
		 * @param array|false $section_fields The section fields from get_option.
		 * @param string      $section_name   The section name.
		 * @param mixed       $default        The default value.
		 */
		$section_fields = apply_filters( 'nextpress_get_setting_section_fields', $section_fields, $section_name, $default );

		$value = isset( $section_fields[ $option_name ] ) ? $section_fields[ $option_name ] : $default;

		/**
		 * Filter the setting value before returning
		 *
		 * @param mixed       $value          The setting value.
		 * @param mixed       $default        The default value.
		 * @param string      $option_name    The option name.
		 * @param array|false $section_fields The section fields.
		 * @param string      $section_name   The section name.
		 */
		return apply_filters( 'nextpress_get_setting_section_field_value', $value, $default, $option_name, $section_fields, $section_name );
	}
}
