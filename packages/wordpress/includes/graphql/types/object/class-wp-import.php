<?php
/**
 * Object Type - WPImport
 *
 * Represents a single entry in the WordPress script module import map.
 *
 * @package NextPress\Uri_Assets\Type\Object
 * @since TBD
 */

namespace NextPress\Uri_Assets\Type\Object;

class WP_Import {
	/**
	 * Registers the type.
	 *
	 * @return void
	 */
	public static function register(): void {
		register_graphql_object_type(
			'WPImport',
			[
				'description' => static function () {
					return __( 'A single import map entry mapping a bare module specifier to a URL.', 'nextpress' );
				},
				'eagerlyLoadType' => true,
				'fields'      => [
					'name' => [
						'type'        => [ 'non_null' => 'String' ],
						'description' => static function () {
							return __( 'The bare module specifier (e.g. "@wordpress/interactivity").', 'nextpress' );
						},
					],
					'path' => [
						'type'        => [ 'non_null' => 'String' ],
						'description' => static function () {
							return __( 'The URL or path the specifier resolves to, formatted according to the requested scheme.', 'nextpress' );
						},
					],
				],
			]
		);
	}
}
