<?php
/**
 * Utility class for WordPress enqueued asset operations.
 *
 * @package NextPress\Uri_Assets\GraphQL\Utils
 * @since TBD
 */

namespace NextPress\Uri_Assets\GraphQL\Utils;

class WP_Assets {
	/**
	 * Get the handles of all assets enqueued for a given content node,
	 * resolving dependencies recursively.
	 *
	 * When $check_script_modules is true, handles that aren't found in
	 * the classic $wp_assets registry are looked up in the WP Script
	 * Modules registry (via NextPress_Script_Modules::get_registered())
	 * and their module-level dependencies are walked recursively.
	 *
	 * @param array<string, string> $queue                List of asset handles for a given content node.
	 * @param \WP_Dependencies      $wp_assets            A global assets object.
	 * @param bool                  $check_script_modules Whether to fall back to the script modules registry.
	 *
	 * @return string[]
	 */
	public static function flatten_enqueued_assets_list( array $queue, $wp_assets, bool $check_script_modules = false ) {
		$registered_scripts = $wp_assets->registered;
		$handles            = [];
		foreach ( $queue as $handle ) {
			if ( 'global-styles' === $handle ) {
				continue;
			}
			if ( ! empty( $registered_scripts[ $handle ] ) ) {
				/** @var \_WP_Dependency $script */
				$script    = $registered_scripts[ $handle ];
				$handles[] = $script->handle;

				// Don't recurse into MODULE dependencies — those are resolved
				// by the browser's import map, not by <script> tags.
				$is_module = isset( $script->extra['type'] ) && 'module' === $script->extra['type'];
				if ( ! $is_module ) {
					$formatted_dependencies = array_map(
						[ __CLASS__, 'format_module_dependency' ],
						(array) ( $script->deps ?? [] )
					);
					$dependencies = self::flatten_enqueued_assets_list( $formatted_dependencies, $wp_assets, $check_script_modules );
					if ( ! empty( $dependencies ) ) {
						array_unshift( $handles, ...$dependencies );
					}
				}

				continue;
			}

			if ( ! $check_script_modules ) {
				continue;
			}

			// Check if it's in the script modules registry.
			$all_modules = class_exists( NextPress_Script_Modules::class ) ? NextPress_Script_Modules::get_registered() : [];
			if ( isset( $all_modules[ $handle ] ) ) {
				$module_data = $all_modules[ $handle ];
				$handles[]   = $handle;

				// Collect module dependency IDs and recurse.
				$module_deps = [];
				foreach ( (array) ( $module_data['dependencies'] ?? [] ) as $dep ) {
					if ( is_array( $dep ) && isset( $dep['id'] ) ) {
						$module_deps[] = (string) $dep['id'];
					} elseif ( is_string( $dep ) ) {
						$module_deps[] = $dep;
					}
				}

				if ( ! empty( $module_deps ) ) {
					$dependencies = self::flatten_enqueued_assets_list( $module_deps, $wp_assets, $check_script_modules );
					if ( ! empty( $dependencies ) ) {
						array_unshift( $handles, ...$dependencies );
					}
				}
			}

		}

		return array_values( array_unique( $handles ) );
	}

	/**
	 * Maps a WP classic script handle to its script module ID where a
	 * known mapping exists. Handles that don't match a known module are
	 * returned as-is.
	 *
	 * @param string $dep A script dependency handle.
	 *
	 * @return string The resolved module ID or the original handle.
	 */
	public static function format_module_dependency( $dep ) {
		switch ( $dep ) {
			case 'wp-interactivity':
				return '@wordpress/interactivity';
			default:
				return $dep;
		}
	}

	/**
	 * Reads the WP Script Modules registry and queue, creates synthetic
	 * _WP_Dependency entries in $wp_scripts->registered for each module,
	 * and pushes queued module IDs onto $wp_scripts->queue so that the
	 * subsequent flatten_enqueued_assets_list call picks them up alongside
	 * classic scripts.
	 *
	 * Each synthetic entry carries extra['type'] = 'module' so the
	 * EnqueuedScript.type GraphQL field can distinguish modules from
	 * classic scripts, and extra['group'] is set from the module's
	 * in_footer arg.
	 *
	 * @return void
	 */
	public static function collect_script_modules_queue() {
		global $wp_scripts;

		if ( ! function_exists( 'wp_script_modules' ) || ! class_exists( NextPress_Script_Modules::class ) || ! $wp_scripts instanceof \WP_Scripts ) {
			return;
		}

		$registered = NextPress_Script_Modules::get_registered();
		$queue      = method_exists( wp_script_modules(), 'get_queue' )
			? wp_script_modules()->get_queue()
			: array_keys( array_filter( $registered, static function ( $entry ) {
				return ! empty( $entry['enqueue'] );
			} ) );

		foreach ( $queue as $handle ) {
			if ( ! in_array( $handle, $wp_scripts->queue ?? [], true ) ) {
				$wp_scripts->queue[] = $handle;
			}
		}

		// Register synthetic _WP_Dependency entries for every known module
		// so the EnqueuedScript connection resolver can find them.
		foreach ( $registered as $id => $data ) {
			$formatted_dependencies = array_map(
				[ __CLASS__, 'format_module_dependency' ],
				array_column( (array) ( $data['dependencies'] ?? [] ), 'id' )
			);
			$version    = isset( $data['version'] ) && is_string( $data['version'] ) ? $data['version'] : false;
			$dependency = new \_WP_Dependency(
				$id,
				(string) ( $data['src'] ?? '' ),
				$formatted_dependencies,
				$version,
				null,
			);
			$dependency->add_data( 'type', 'module' );
			$dependency->add_data( 'group', ! empty( $data['args']['in_footer'] ) ? 1 : 0 );

			$wp_scripts->registered[ $id ] = $dependency;
		}
	}

	/**
	 * Captures the `<script type="importmap">` markup that WP would print in
	 * wp_head for the currently enqueued script modules. Empty string when
	 * script modules aren't supported or nothing is enqueued.
	 *
	 * @return string
	 */
	public static function get_import_map_html(): string {
		if ( ! function_exists( 'wp_script_modules' ) ) {
			return '';
		}

		ob_start();
		wp_script_modules()->print_import_map();
		$html = ob_get_clean();

		return is_string( $html ) ? trim( $html ) : '';
	}

	/**
	 * Captures the `<script type="module">` tags that WP would print in
	 * wp_footer for the currently enqueued script modules.
	 *
	 * @return string
	 */
	public static function get_enqueued_script_modules_html(): string {
		if ( ! function_exists( 'wp_script_modules' ) ) {
			return '';
		}

		ob_start();
		wp_script_modules()->print_enqueued_script_modules();
		$html = ob_get_clean();

		return is_string( $html ) ? trim( $html ) : '';
	}

	/**
	 * Captures the `<link rel="modulepreload">` tags that WP would print for
	 * the currently enqueued script modules' dependency graph.
	 *
	 * @return string
	 */
	public static function get_script_module_preloads_html(): string {
		if ( ! function_exists( 'wp_script_modules' ) ) {
			return '';
		}

		ob_start();
		wp_script_modules()->print_script_module_preloads();
		$html = ob_get_clean();

		return is_string( $html ) ? trim( $html ) : '';
	}
}
