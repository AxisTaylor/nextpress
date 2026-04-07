<?php
/**
 * Class Root_Query
 *
 * @package NextPress\Uri_Assets\GraphQL\Type\Object
 * @since TBD
 */

namespace NextPress\Uri_Assets\Type\Object;

class Root_Query {
	/**
	 * Registers the root query fields.
	 *
	 * @return void
	 */
	public static function register() {
		register_graphql_field(
			'RootQuery',
			'assetsByUri',
			[
				'type'        => 'UriAssets',
				'description' => static function () {
					return __( 'Fetch enqueued scripts and stylesheets for a given URI.', 'nextpress' );
				},
				'args'        => [
					'uri' => [
						'type'        => [ 'non_null' => 'String' ],
						'description' => static function () {
							return __( 'Unique Resource Identifier in the form of a path or permalink for a node. Ex: "/hello-world"', 'nextpress' );
						},
					],
				],
				'resolve'     => static function ( $root, $args, $context ) {
					return $context->get_loader( 'uri_assets' )->load( $args['uri'] );
				},
			]
		);

		register_graphql_field(
			'RootQuery',
			'globalStyles',
			[
				'type'        => 'GlobalStyles',
				'description' => static function () {
					return __( 'Global WordPress styles including theme.json stylesheet, custom CSS, and font faces.', 'nextpress' );
				},
				'resolve'     => static function () {
					return [];
				},
			]
		);
	}
}
