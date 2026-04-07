<?php
/**
 * Enum Type - ScriptLoadingGroupEnum
 *
 * @package NextPress\Uri_Assets\Type\Enum
 * @since TBD
 */

namespace NextPress\Uri_Assets\Type\Enum;

class Script_Loading_Group_Enum {
	/**
	 * Registers the enum type.
	 *
	 * @return void
	 */
	public static function register(): void {
		register_graphql_enum_type(
			'ScriptLoadingGroupEnum',
			[
				'description' => static function () {
					return __( 'Locations for script to be loaded', 'nextpress' );
				},
				'values'      => [
					'HEADER' => [
						'value'       => 0,
						'description' => __( 'Script to be loaded in document `<head>` tags', 'nextpress' ),
					],
					'FOOTER' => [
						'value'       => 1,
						'description' => __( 'Script to be loaded in document at right before the closing `<body>` tag', 'nextpress' ),
					],
				],
			]
		);
	}
}
