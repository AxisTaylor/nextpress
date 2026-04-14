<?php
/**
 * Field extensions for EnqueuedAsset and EnqueuedScript types.
 *
 * @package NextPress\Uri_Assets\Type\Object
 * @since TBD
 */

namespace NextPress\Uri_Assets\Type\Object;

use NextPress\Uri_Assets\GraphQL\Model\Uri_Assets;

class Enqueued_Asset_Fields {
	/**
	 * Registers the field extensions.
	 *
	 * @return void
	 */
	public static function register(): void {
		deregister_graphql_field( 'EnqueuedAsset', 'group' );
		register_graphql_field(
			'EnqueuedAsset',
			'group',
			[
				'type'        => 'Integer',
				'description' => static function () {
					return __( 'The loading group to which this asset belongs.', 'nextpress' );
				},
				'resolve'     => static function ( $asset ) {
					if ( ! isset( $asset->extra['group'] ) ) {
						return 0;
					}
					return absint( $asset->extra['group'] );
				},
			]
		);

		register_graphql_field(
			'EnqueuedScript',
			'location',
			[
				'type'        => 'ScriptLoadingGroupEnum',
				'description' => static function () {
					return __( 'The location where this script should be loaded', 'nextpress' );
				},
				'resolve'     => static function ( \_WP_Dependency $script ) {
					return Uri_Assets::get_script_location( $script );
				},
			]
		);

		register_graphql_field(
			'EnqueuedScript',
			'type',
			[
				'type'        => 'ScriptTypeEnum',
				'description' => static function () {
					return __( 'Whether this is a classic script or an ES module (WP Script Modules API).', 'nextpress' );
				},
				'resolve'     => static function ( \_WP_Dependency $script ) {
					return isset( $script->extra['type'] ) && 'module' === $script->extra['type']
						? 'module'
						: 'classic';
				},
			]
		);

		deregister_graphql_field( 'EnqueuedScript', 'dependencies' );
		register_graphql_field(
			'EnqueuedScript',
			'dependencies',
			[
				'type'        => [ 'list_of' => 'EnqueuedScript' ],
				'description' => static function () {
					return __( 'Handles of dependencies needed to use this asset', 'nextpress' );
				},
				'resolve'     => static function ( $asset ) {
					return ! empty( $asset->deps ) ? Uri_Assets::resolve_enqueued_assets( 'script', $asset->deps ) : [];
				},
			]
		);
	}
}
