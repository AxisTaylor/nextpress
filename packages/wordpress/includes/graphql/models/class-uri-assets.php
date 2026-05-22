<?php
/**
 * Class Model - Defines the Model class for URI asset resolution.
 *
 * @package NextPress\Uri_Assets\GraphQL\Model
 * @since 0.0.1
 */

namespace NextPress\Uri_Assets\GraphQL\Model;

use GraphQLRelay\Relay;
use WPGraphQL\Model\Model;
use GraphQL\Error\UserError;
use NextPress\Uri_Assets\GraphQL\Utils\WP_Assets;
use NextPress\Uri_Assets\GraphQL\Utils\NextPress_Script_Modules;


/**
 * Class Uri_Assets
 *
 * @property string   $ID
 * @property string   $id
 * @property string   $uri
 * @property string[] $enqueuedScriptsQueue
 * @property string[] $enqueuedStylesheetsQueue
 * @property array    $importMap
 */
class Uri_Assets extends Model {
	/**
	 * URI/Path for asset
	 *
	 * @var string $path
	 */
	protected $path;

	/**
	 * Node connected to URI/Path
	 *
	 * @var \WPGraphQL\Model\Post $data
	 */
	protected $data;

	/**
	 * Store the global post to reset during model tear down
	 *
	 * @var ?\WP_Post
	 */
	protected $global_post;

	/**
	 * Model constructor
	 *
	 * @param string $uri URI/Path.
	 *
	 * @throws UserError When the URI doesn't resolve to content.
	 */
	public function __construct( $uri ) {
		$this->path = $uri;
		$context    = \WPGraphQL::get_app_context();
		$promise    = $context->node_resolver->resolve_uri( $this->path );
		\GraphQL\Deferred::runQueue();

		if ( null === $promise ) {
			throw new UserError( sprintf( 'No content found for URI: %s', $uri ) );
		}

		$this->data = $promise->result;

		$allowed_restricted_fields = [
			'isRestricted',
			'isPrivate',
			'isPublic',
			'id',
			'databaseId',
		];

		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
		$restricted_cap = apply_filters( 'uri_assets_restricted_cap', '' );

		if ( $this->data instanceof \WPGraphQL\Model\Post ) {
			$this->setup_post_globals();
		}

		parent::__construct( $restricted_cap, $allowed_restricted_fields, null );
	}

	/**
	 * Determines if the item should be considered private.
	 *
	 * @return bool
	 */
	protected function is_private() {
		return false;
	}

	/**
	 * Determines if all of a script's dependencies are loaded in the footer.
	 *
	 * @param \_WP_Dependency $script The script to check.
	 *
	 * @return bool
	 */
	public static function all_dependencies_in_footer( \_WP_Dependency $script ) {
		$dependencies = $script->deps;
		foreach ( $dependencies as $handle ) {
			$dependency = wp_scripts()->registered[ $handle ] ?? null;
			if ( null === $dependency ) {
				continue;
			}
			if ( 1 === self::get_script_location( $dependency ) ) {
				continue;
			}

			return false;
		}

		return true;
	}

	/**
	 * Get the location of a script.
	 *
	 * @param \_WP_Dependency $script The script to check.
	 *
	 * @return int
	 */
	public static function get_script_location( \_WP_Dependency $script ) {
		if ( ! isset( $script->extra['group'] ) ) {
			return 0;
		}

		if ( self::all_dependencies_in_footer( $script ) ) {
			return 1;
		}

		return absint( $script->extra['group'] );
	}

	/**
	 * Resolve the enqueued assets for a list of handles.
	 *
	 * @param string   $type          The type of asset to resolve.
	 * @param string[] $asset_handles The list of asset handles to resolve.
	 *
	 * @return array
	 *
	 * @throws UserError If the asset type is invalid.
	 */
	public static function resolve_enqueued_assets( $type, $asset_handles ) {
		switch ( $type ) {
			case 'script':
				global $wp_scripts;
				$enqueued_assets = $wp_scripts->registered;
				break;
			case 'style':
				global $wp_styles;
				$enqueued_assets = $wp_styles->registered;
				break;
			default:
				/* translators: %s is the asset type */
				throw new UserError( sprintf( __( '%s Invalid asset type', 'nextpress' ), $type ) ); //phpcs:ignore
		}

		return array_filter(
			$enqueued_assets,
			static function ( $asset ) use ( $asset_handles ) {
				return in_array( $asset->handle, $asset_handles, true );
			}
		);
	}

	/**
	 * Sets up global WordPress post state for the resolved URI.
	 *
	 * @return void
	 */
	public function setup_post_globals() {
		global $wp_query, $post;

		$this->global_post = $post;

		$incoming_post = get_post( $this->data->ID );

		if ( $incoming_post instanceof \WP_Post ) {
			$id        = $incoming_post->ID;
			$post_type = $incoming_post->post_type;
			$post_name = $incoming_post->post_name;
			$data      = $incoming_post;

			$wp_query->reset_postdata();

			if ( 'post' === $post_type ) {
				$wp_query->parse_query(
					[
						'page' => '',
						'p'    => $id,
					]
				);
			} elseif ( 'page' === $post_type ) {
				$wp_query->parse_query(
					[
						'page'     => '',
						'pagename' => $post_name,
					]
				);
			} elseif ( 'attachment' === $post_type ) {
				$wp_query->parse_query(
					[
						'attachment' => $post_name,
					]
				);
			} else {
				$wp_query->parse_query(
					[
						$post_type  => $post_name,
						'post_type' => $post_type,
						'name'      => $post_name,
					]
				);
			}

			$wp_query->setup_postdata( $data );
			$GLOBALS['post']             = $data; // phpcs:ignore WordPress.WP.GlobalVariablesOverride
			$wp_query->queried_object    = get_post( $this->data->ID );
			$wp_query->queried_object_id = $this->data->ID;
		}
	}

	/**
	 * Simulates WP template rendering to trigger all asset enqueue hooks.
	 *
	 * Fires wp_head, renders the post content (which processes blocks and
	 * enqueues their scripts/styles/modules), fires sidebar and wp_footer,
	 * then discards all output. After this call, $wp_scripts, $wp_styles,
	 * and wp_script_modules() contain the full set of enqueued assets for
	 * the resolved URI.
	 *
	 * @return void
	 */
	protected function simulate_render() {
		do_action( 'nextpress_pre_simulate_render' );

		ob_start();
		wp_head();

		$this->data->contentRendered;
		$this->data->ID;

		// Block rendering populates the Style Engine with layout CSS
		// (e.g. gallery column rules) but wp_enqueue_stored_styles() already
		// ran during wp_head — before the blocks were rendered. Re-run it
		// so the generated CSS (core-block-supports) gets enqueued.
		if ( function_exists( 'wp_enqueue_stored_styles' ) ) {
			wp_enqueue_stored_styles();
		}

		do_action( 'get_sidebar', null, [] );
		wp_footer();
		ob_end_clean();

		do_action( 'nextpress_post_simulate_render' );
	}

	/**
	 * Initializes the field resolvers.
	 */
	protected function init() {
		if ( ! empty( $this->fields ) ) {
			return;
		}

		$this->fields = [
			'ID'                       => function () {
				return $this->path;
			},
			'id'                       => function () {
				return ! empty( $this->path ) ? Relay::toGlobalId( 'asset', $this->path ) : null;
			},
			'uri'                      => function () {
				return $this->path;
			},
			'enqueuedScriptsQueue'     => function () {

				$this->simulate_render();

				// Fold enqueued script modules into $wp_scripts so they
				// appear alongside classic scripts. Wrapped in try/catch
				// so a failure here doesn't break the classic scripts list.
				try {
					WP_Assets::collect_script_modules_queue();
				} catch ( \Throwable $e ) {
					graphql_debug(
						sprintf( 'collect_script_modules_queue failed: %s', $e->getMessage() )
					);
				}

				global $wp_scripts;
				$queue = WP_Assets::flatten_enqueued_assets_list( $wp_scripts->queue ?? [], $wp_scripts );

				$wp_scripts->reset();
				$wp_scripts->queue = [];

				return $queue;
			},
			'enqueuedStylesheetsQueue' => function () {
				global $wp_styles;

				$this->simulate_render();
				$queue = WP_Assets::flatten_enqueued_assets_list( $wp_styles->queue ?? [], $wp_styles );

				$wp_styles->reset();
				$wp_styles->queue = [];

				return $queue;
			},
			'importMap'                => function () {
				$this->simulate_render();

				$import_map = NextPress_Script_Modules::get_enqueued_import_map();
				graphql_debug( sprintf( 'importMap: keys=%s', wp_json_encode( array_keys( $import_map ) ) ) );
				graphql_debug( sprintf( 'importMap imports: %s', wp_json_encode( $import_map['imports'] ?? 'none' ) ) );
				return $import_map['imports'] ?? [];
			},
		];
	}
}
