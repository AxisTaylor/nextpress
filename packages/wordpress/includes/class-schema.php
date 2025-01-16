<?php
/**
 * Class Schema
 *
 * @package NextPress\Uri_Assets;
 * @since 0.0.1
 */

namespace NextPress\Uri_Assets;

use WPGraphQL\Data\Connection\EnqueuedScriptsConnectionResolver;
use WPGraphQL\Data\Connection\EnqueuedStylesheetConnectionResolver;
use NextPress\Uri_Assets\Model;

class Schema {
	/**
	 * Schema constructor
	 */
	public function __construct() {
		$this->init();
	}

	/**
	 * Initializes the class.
	 *
	 * @return void
	 */
	private function init() {
		add_action( 'graphql_register_types', [ $this, 'register_schema' ], 5 );
	}

	/**
	 * Register the schema
	 *
	 * @return void
	 */
	public function register_schema() {
		register_graphql_enum_type(
			'ScriptLoadingGroupEnum',
			[
				'description' => __( 'Locations for script to be loaded', 'nextpress' ),
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

		register_graphql_field(
			'EnqueuedAsset',
			'group',
			[
				'type'        => 'Integer',
				'description' => __( 'The loading group to which this asset belongs.', 'nextpress' ),
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
				'description' => __( 'The location where this script should be loaded', 'nextpress' ),
				'resolve'     => static function ( \_WP_Dependency $script ) {
					return Model::get_script_location( $script );
				},
			]
		);

		deregister_graphql_field('EnqueuedScript', 'dependencies');
		register_graphql_field(
			'EnqueuedScript',
			'dependencies',
			[
				'type'        => [ 'list_of' => 'EnqueuedScript' ],
				'description' => __( 'Handles of dependencies needed to use this asset', 'nextpress' ),
				'resolve'     => static function ( $asset ) {
					return ! empty( $asset->deps ) ? Model::resolve_enqueued_assets( 'script', $asset->deps ) : [];
				},
			]
		);
		// Register the URI Assets type
		register_graphql_object_type(
			'UriAssets',
			[
				'interfaces'  => [ 'Node' ],
				'fields'      => [
					'id'  => [
						'type'        => [ 'non_null' => 'ID' ],
						'description' => __( 'The global ID of the URI Assets object.', 'nextpress' ),
					],
					'uri' => [
						'type'        => 'String',
						'description' => __( 'Unique Resource Identifier in the form of a path or permalink for a node. Ex: "/hello-world"', 'nextpress' ),
					],
				],
				'connections' => [
					'enqueuedScripts'     => [
						'toType'  => 'EnqueuedScript',
						'resolve' => static function ( $source, $args, $context, $info ) {
							$resolver = new EnqueuedScriptsConnectionResolver( $source, $args, $context, $info );
							return $resolver->get_connection();
						},
					],
					'enqueuedStylesheets' => [
						'toType'  => 'EnqueuedStylesheet',
						'resolve' => static function ( $source, $args, $context, $info ) {
							$resolver = new EnqueuedStylesheetConnectionResolver( $source, $args, $context, $info );
							return $resolver->get_connection();
						},
					],
				],
			]
		);

		register_graphql_field(
			'RootQuery',
			'assetsByUri',
			[
				'type'    => 'UriAssets',
				'args'    => [
					'uri' => [
						'type'        => [ 'non_null' => 'String' ],
						'description' => __( 'Unique Resource Identifier in the form of a path or permalink for a node. Ex: "/hello-world"', 'nextpress' ),
					],
				],
				'resolve' => function ( $root, $args, $context, $info ) {
					return $context->get_loader( 'uri_assets' )->load( $args['uri'] );
				},
			]
		);
	}
}
