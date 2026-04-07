<?php
/**
 * Object Type - UriAssets
 *
 * @package NextPress\Uri_Assets\Type\Object
 * @since TBD
 */

namespace NextPress\Uri_Assets\Type\Object;

use WPGraphQL\Data\Connection\EnqueuedScriptsConnectionResolver;
use WPGraphQL\Data\Connection\EnqueuedStylesheetConnectionResolver;

class Uri_Assets {
	/**
	 * Registers the type and root query field.
	 *
	 * @return void
	 */
	public static function register(): void {
		register_graphql_object_type(
			'UriAssets',
			[
				'description' => static function () {
					return __( 'Enqueued scripts and stylesheets for a given URI.', 'nextpress' );
				},
				'interfaces'  => [ 'Node' ],
				'fields'      => [
					'id'  => [
						'type'        => [ 'non_null' => 'ID' ],
						'description' => static function () {
							return __( 'The global ID of the URI Assets object.', 'nextpress' );
						},
					],
					'uri' => [
						'type'        => 'String',
						'description' => static function () {
							return __( 'Unique Resource Identifier in the form of a path or permalink for a node. Ex: "/hello-world"', 'nextpress' );
						},
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
	}
}
