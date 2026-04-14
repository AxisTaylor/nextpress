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
use NextPress\Uri_Assets\GraphQL\Utils\NextPress_Script_Modules;

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
					'importMap' => [
						'type'        => [ 'list_of' => 'WPImport' ],
						'description' => static function () {
							return __( 'The import map entries for enqueued script modules, mapping bare specifiers to URLs.', 'nextpress' );
						},
						'args'        => [
							'scheme' => [
								'type'        => 'ImportMapSchemeEnum',
								'description' => __( 'URL scheme for the returned paths.', 'nextpress' ),
								'defaultValue' => 'full',
							],
						],
						'resolve'     => static function ( $source, $args ) {
							$imports = $source->importMap ?? [];
							if ( empty( $imports ) ) {
								return [];
							}

							$scheme  = $args['scheme'] ?? 'full';
							$entries = [];

							// Strip the site_url path prefix (e.g. "/wp" in Bedrock)
							// so relative paths start from the WP root.
							$site_url_path = wp_parse_url( site_url(), PHP_URL_PATH ) ?: '';

							foreach ( $imports as $name => $url ) {
								$path = $url;

								if ( 'relative' === $scheme ) {
									$parsed   = wp_parse_url( $url );
									$url_path = $parsed['path'] ?? '/';

									// Strip site_url prefix (e.g. "/wp") from the path
									if ( $site_url_path && 0 === strpos( $url_path, $site_url_path . '/' ) ) {
										$url_path = substr( $url_path, strlen( $site_url_path ) );
									}

									$path = $url_path
										. ( ! empty( $parsed['query'] ) ? '?' . $parsed['query'] : '' );
								}

								$entries[] = [
									'name' => $name,
									'path' => $path,
								];
							}

							return $entries;
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
