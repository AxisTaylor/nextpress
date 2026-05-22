<?php
/**
 * Class NextPress_Script_Modules
 *
 * Extends WP_Script_Modules to expose the private $registered property via
 * a static accessor. Used by WP_Assets::collect_script_modules_queue() to
 * read enqueued script modules and fold them into the EnqueuedScript
 * connection alongside classic scripts.
 *
 * @package NextPress\Uri_Assets\GraphQL\Utils
 * @since TBD
 */

namespace NextPress\Uri_Assets\GraphQL\Utils;

class NextPress_Script_Modules extends \WP_Script_Modules {
	/**
	 * Returns the full registered script modules array from the current
	 * global WP_Script_Modules instance.
	 *
	 * Uses Closure::bind to access the private $registered property from
	 * within the declaring class's scope. This avoids reflection and works
	 * with any WP_Script_Modules instance (including the base class).
	 *
	 * @return array<string, array<string, mixed>> Keyed by module ID.
	 */
	public static function get_registered(): array {
		$reader = \Closure::bind(
			static function ( \WP_Script_Modules $instance ) {
				return $instance->registered;
			},
			null,
			\WP_Script_Modules::class
		);

		return $reader( \wp_script_modules() );
	}

	public static function get_enqueued_import_map(): array {
		$reader = \Closure::bind(
			static function ( \WP_Script_Modules $instance ) {
				return $instance->get_import_map();
			},
			null,
			\WP_Script_Modules::class
		);

		return $reader( \wp_script_modules() );
	}
}
