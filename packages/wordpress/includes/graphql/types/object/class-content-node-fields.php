<?php
/**
 * Field extensions for the ContentNode interface.
 *
 * Adds a `contentCssClasses` field that returns the CSS classes WordPress
 * would apply to the post-content block wrapper based on the active
 * template's layout attribute and theme.json settings.
 *
 * @package NextPress\Uri_Assets\Type\Object
 * @since TBD
 */

namespace NextPress\Uri_Assets\Type\Object;

class Content_Node_Fields {
	/**
	 * Registers the field extensions on the ContentNode interface.
	 *
	 * @return void
	 */
	public static function register(): void {
		register_graphql_field(
			'ContentNode',
			'contentCssClasses',
			[
				'type'        => [ 'list_of' => 'String' ],
				'description' => static function () {
					return __( 'CSS classes WordPress applies to the post-content wrapper based on the template layout attribute and theme.json settings.', 'nextpress' );
				},
				'resolve'     => static function ( $post ) {
					return self::resolve_content_css_classes( $post );
				},
			]
		);
	}

	/**
	 * Resolves CSS classes by parsing the block template for the post's
	 * `core/post-content` block and reading its layout attribute. No
	 * template rendering is performed.
	 *
	 * @param \WPGraphQL\Model\Post $post The post model.
	 *
	 * @return string[]
	 */
	private static function resolve_content_css_classes( $post ): array {
		$post_id = $post->databaseId ?? ( $post->ID ?? 0 );
		if ( ! $post_id ) {
			return [];
		}

		$wp_post = get_post( $post_id );
		if ( ! $wp_post ) {
			return [];
		}

		$template_content = self::get_template_content_for_post( $wp_post );
		if ( ! $template_content ) {
			return [];
		}

		$layout = self::extract_post_content_layout( $template_content );

		return self::build_class_list( $layout );
	}

	/**
	 * Gets the raw block template markup for a given post (no rendering).
	 *
	 * @param \WP_Post $post The post object.
	 *
	 * @return string|null
	 */
	private static function get_template_content_for_post( \WP_Post $post ): ?string {
		$post_type = $post->post_type;

		// Check for a custom page template first.
		$template_slug = get_page_template_slug( $post );
		if ( $template_slug ) {
			$template = get_block_template( get_stylesheet() . '//' . $template_slug );
			if ( $template && ! empty( $template->content ) ) {
				return $template->content;
			}
		}

		// Standard template hierarchy.
		$slugs = [];
		if ( 'page' === $post_type ) {
			$slugs[] = 'page-' . $post->post_name;
			$slugs[] = 'page-' . $post->ID;
			$slugs[] = 'page';
		} elseif ( 'post' === $post_type ) {
			$slugs[] = 'single-post-' . $post->post_name;
			$slugs[] = 'single-post';
			$slugs[] = 'single';
		} else {
			$slugs[] = 'single-' . $post_type . '-' . $post->post_name;
			$slugs[] = 'single-' . $post_type;
			$slugs[] = 'single';
		}
		$slugs[] = 'singular';
		$slugs[] = 'index';

		foreach ( $slugs as $slug ) {
			$template = get_block_template( get_stylesheet() . '//' . $slug );
			if ( $template && ! empty( $template->content ) ) {
				return $template->content;
			}
		}

		return null;
	}

	/**
	 * Extracts the layout attribute from the `core/post-content` block
	 * comment in raw template markup.
	 *
	 * @param string $template_content Raw block template markup.
	 *
	 * @return array The layout attribute array, or empty array if none.
	 */
	private static function extract_post_content_layout( string $template_content ): array {
		// Match <!-- wp:post-content {JSON} /--> allowing nested braces in the JSON.
		if ( ! preg_match( '/<!--\s*wp:post-content\s+(\{.+?\})\s*\/?-->/s', $template_content, $matches ) ) {
			return [];
		}

		if ( empty( $matches[1] ) ) {
			return [];
		}

		$attrs = json_decode( $matches[1], true );
		if ( ! is_array( $attrs ) || ! isset( $attrs['layout'] ) ) {
			return [];
		}

		return $attrs['layout'];
	}

	/**
	 * Builds the CSS class list from a layout attribute array, mirroring
	 * the logic in wp_render_layout_support_flag().
	 *
	 * @param array $layout The layout attribute (e.g. ['type' => 'constrained']).
	 *
	 * @return string[]
	 */
	private static function build_class_list( array $layout ): array {
		$classes = [];

		// Determine layout type. Legacy `inherit` or `contentSize` maps to constrained.
		$type = $layout['type'] ?? 'default';
		if ( ! empty( $layout['inherit'] ) || ! empty( $layout['contentSize'] ) ) {
			$type = 'constrained';
		}

		// Layout type class from wp_get_layout_definitions().
		$layout_definitions = wp_get_layout_definitions();
		$layout_classname   = $layout_definitions[ $type ]['className']
			?? $layout_definitions['default']['className']
			?? '';

		if ( $layout_classname ) {
			$classes[] = sanitize_title( $layout_classname );
		}

		// Block-specific layout class: wp-block-post-content-is-layout-{type}.
		if ( $layout_classname ) {
			$classes[] = 'wp-block-post-content-' . sanitize_title( $layout_classname );
		}

		// has-global-padding when constrained + useRootPaddingAwareAlignments.
		$global_settings              = wp_get_global_settings();
		$root_padding_aware           = $global_settings['useRootPaddingAwareAlignments'] ?? false;
		if ( $root_padding_aware && 'constrained' === $type ) {
			$classes[] = 'has-global-padding';
		}

		// Orientation class (e.g. is-vertical, is-horizontal).
		if ( ! empty( $layout['orientation'] ) ) {
			$classes[] = 'is-' . sanitize_title( $layout['orientation'] );
		}

		// Justify content class (e.g. is-content-justification-center).
		if ( ! empty( $layout['justifyContent'] ) ) {
			$classes[] = 'is-content-justification-' . sanitize_title( $layout['justifyContent'] );
		}

		// Nowrap class for flex layouts.
		if ( ! empty( $layout['flexWrap'] ) && 'nowrap' === $layout['flexWrap'] ) {
			$classes[] = 'is-nowrap';
		}

		return $classes;
	}
}
