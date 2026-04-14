<?php
/**
 * Enum Type - ImportMapSchemeEnum
 *
 * @package NextPress\Uri_Assets\Type\Enum
 * @since TBD
 */

namespace NextPress\Uri_Assets\Type\Enum;

class Import_Map_Scheme_Enum {
	/**
	 * Registers the enum type.
	 *
	 * @return void
	 */
	public static function register(): void {
		register_graphql_enum_type(
			'ImportMapSchemeEnum',
			[
				'description' => static function () {
					return __( 'URL scheme for import map paths.', 'nextpress' );
				},
				'values'      => [
					'FULL'      => [
						'value'       => 'full',
						'description' => __( 'Full absolute URLs as registered by WordPress.', 'nextpress' ),
					],
					'RELATIVE'  => [
						'value'       => 'relative',
						'description' => __( 'Relative paths with the protocol and domain stripped.', 'nextpress' ),
					],
				],
			]
		);
	}
}
