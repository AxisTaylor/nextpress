<?php
/**
 * Class NextPress_Script_Modules
 *
 * Static helper that reads the live `WP_Script_Modules` registry and
 * import map. Used by `WP_Assets::collect_script_modules_queue()` to
 * fold enqueued script modules into the EnqueuedScript connection
 * alongside classic scripts.
 *
 * An earlier version of this class extended `\WP_Script_Modules` and
 * redeclared `get_registered()` as `static`. That worked on WP < 6.7
 * because the parent had no `get_registered()` method — but WP 6.7
 * shipped one as a non-static public method, and PHP fatal-errors
 * when a subclass changes a method's static-ness ("Cannot make non
 * static method WP_Script_Modules::get_registered() static …"),
 * taking the plugin down before it could boot.
 *
 * The fix is to drop the inheritance entirely. Both static helpers
 * below resolve the live instance through `wp_script_modules()` and
 * prefer the public API when WP exposes it; only on older WP do they
 * fall back to a `Closure::bind` rebound to `WP_Script_Modules`'s
 * class scope, which grants access to the otherwise private/protected
 * registry and import-map.
 *
 * Static method signatures are unchanged — callers
 * (`WP_Assets::collect_script_modules_queue()`,
 * `Uri_Assets::resolve_import_map_field()`) need no updates.
 *
 * @package NextPress\Uri_Assets\GraphQL\Utils
 * @since TBD
 */

namespace NextPress\Uri_Assets\GraphQL\Utils;

class NextPress_Script_Modules {
	/**
	 * Returns the full registered script modules array, keyed by module ID.
	 *
	 * Uses `WP_Script_Modules::get_registered()` when available (WP 6.7+)
	 * and falls back to a scope-bound closure that reads the private
	 * `$registered` property on older WordPress installs.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function get_registered(): array {
		$modules = \wp_script_modules();

		if ( method_exists( $modules, 'get_registered' ) ) {
			return $modules->get_registered();
		}

		$reader = \Closure::bind(
			static function ( \WP_Script_Modules $instance ) {
				return $instance->registered;
			},
			null,
			\WP_Script_Modules::class
		);

		return $reader( $modules );
	}

	/**
	 * Returns the import map for currently-enqueued script modules.
	 *
	 * `WP_Script_Modules::get_import_map()` is protected in core, so the
	 * read goes through a closure rebound to that class's scope. Works
	 * on every WP version that ships `WP_Script_Modules`.
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
