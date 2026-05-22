<?php
/**
 * Class NextPress_Script_Modules
 *
 * Extends WP_Script_Modules to expose the private $registered property via
 * static accessors. Used by WP_Assets::collect_script_modules_queue() to
 * read enqueued script modules and fold them into the EnqueuedScript
 * connection alongside classic scripts.
 *
 * Why the static methods are named `get_registered_modules()` and
 * `get_enqueued_import_map()` rather than `get_registered()` / `get_import_map()`:
 * WordPress 6.7+ added public methods on `WP_Script_Modules` with those
 * latter names. Redeclaring them here as `static` triggers a PHP fatal
 * ("Cannot make non static method WP_Script_Modules::get_registered() static …")
 * the moment the parent class is autoloaded on a 6.7+ install, taking the
 * plugin down before it can boot. Naming our accessors differently sidesteps
 * the signature collision while keeping the `extends` relationship intact
 * (the closure scope binding still relies on the parent class identity).
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
	 * within WP_Script_Modules' class scope. This avoids reflection and
	 * works with any WP_Script_Modules instance.
	 *
	 * Named `get_registered_modules()` instead of `get_registered()` to
	 * avoid the WP 6.7+ static-vs-instance signature collision documented
	 * on the class.
	 *
	 * @return array<string, array<string, mixed>> Keyed by module ID.
	 */
	public static function get_registered_modules(): array {
		// Read the private `$registered` property via a closure rebound
		// to WP_Script_Modules' class scope.
		//
		// Note: WP 7.0 added a public `WP_Script_Modules::get_registered( string $id )`
		// — but it returns a single module by ID, NOT the full registry,
		// so we can't delegate to it here. The closure-bound read works on
		// every WP version that ships the class.
		$reader = \Closure::bind(
			static function ( \WP_Script_Modules $instance ) {
				return $instance->registered;
			},
			null,
			\WP_Script_Modules::class
		);

		return $reader( \wp_script_modules() );
	}

	/**
	 * Returns the import map for currently-enqueued script modules.
	 *
	 * Wraps WP_Script_Modules' private `get_import_map()` via a closure
	 * rebound to the parent class scope.
	 *
	 * @return array<string, mixed>
	 */
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
