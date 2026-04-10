<?php
/**
 * Enum Type - ScriptTypeEnum
 *
 * @package NextPress\Uri_Assets\Type\Enum
 * @since TBD
 */

namespace NextPress\Uri_Assets\Type\Enum;

class Script_Type_Enum {
	/**
	 * Registers the enum type.
	 *
	 * @return void
	 */
	public static function register(): void {
		register_graphql_enum_type(
			'ScriptTypeEnum',
			[
				'description' => static function () {
					return __( 'The kind of script a given EnqueuedScript represents.', 'nextpress' );
				},
				'values'      => [
					'CLASSIC' => [
						'value'       => 'classic',
						'description' => __( 'A classic script, loaded via `<script src="...">`.', 'nextpress' ),
					],
					'MODULE'  => [
						'value'       => 'module',
						'description' => __( 'An ES module, loaded via `<script type="module" src="...">`. Registered through the WordPress Script Modules API (WP 6.5+).', 'nextpress' ),
					],
				],
			]
		);
	}
}
