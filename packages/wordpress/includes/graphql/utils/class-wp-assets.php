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
	 * @param array<string, string> $queue      List of asset handles for a given content node.
	 * @param \WP_Dependencies      $wp_assets  A global assets object.
	 *
	 * @return string[]
	 */
	public static function flatten_enqueued_assets_list( array $queue, $wp_assets ) {
		$registered_scripts = $wp_assets->registered;
		$handles            = [];
		foreach ( $queue as $handle ) {
			if ( empty( $registered_scripts[ $handle ] ) ) {
				continue;
			}

			/** @var \_WP_Dependency $script */
			$script    = $registered_scripts[ $handle ];
			$handles[] = $script->handle;

			$dependencies = self::flatten_enqueued_assets_list( $script->deps, $wp_assets );
			if ( empty( $dependencies ) ) {
				continue;
			}

			array_unshift( $handles, ...$dependencies );
		}

		return array_values( array_unique( $handles ) );
	}
}
