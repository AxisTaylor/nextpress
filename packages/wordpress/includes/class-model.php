<?php
/**
 * Class Model - Defines the Model class for the plugin.
 *
 * @package NextPress\Uri_Assets
 * @since 0.0.1
 */

namespace NextPress\Uri_Assets;

use GraphQLRelay\Relay;
use WPGraphQL\Model\Model as Base;
use GraphQL\Error\UserError;

/**
 * Class Tax_Rate
 * @property string                $path
 * @property \WPGraphQL\Model\Post $data
 *
 * @property string   $ID
 * @property string   $id
 * @property string   $uri
 * @property string[] $enqueuedScriptsQueue
 * @property string[] $enqueuedStylesheetsQueue
 *
 * @package WPGraphQL\WooCommerce\Model
 */
class Model extends Base {
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
	 * Store the instance of the WP_Query
	 *
	 * @var \WP_Query
	 */
	protected $wp_query;

	/**
	 * Store the global post to reset during model tear down
	 *
	 * @var \WP_Post
	 */
	protected $global_post;

	/**
	 * Model constructor
	 *
	 * @param string $uri URI/Path.
	 */
	public function __construct( $uri ) {
		$this->path = $uri;
		$context    = \WPGraphQL::get_app_context();
		$promise = $context->node_resolver->resolve_uri( $this->path );
		\GraphQL\Deferred::runQueue();

		// Check if promise is null (URI doesn't resolve to any content)
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
			$this->setup();
		}
		parent::__construct( $restricted_cap, $allowed_restricted_fields, null );
	}

	/**
	 * Determines if the item should be considered private
	 *
	 * @return bool
	 */
	protected function is_private() {
		return false;
	}

	/**
	 * Determines if assets dependencies are all loaded in the footer.
	 *
	 * @param \_WP_Dependency $script  The script to check.
	 *
	 * @return bool
	 */
	public static function all_dependencies_in_footer( \_WP_Dependency $script ) {
		$dependencies = $script->deps;
		foreach ( $dependencies as $handle ) {
			$dependency = wp_scripts()->registered[ $handle ];
			if ( 1 === self::get_script_location( $dependency ) ) {
				continue;
			}

			return false;
		}

		return true;
	}

	/**
	 * Get the location of a script
	 *
	 * @return bool
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
	 * Get the handles of all scripts enqueued for a given content node
	 *
	 * @param array<string, string> $queue      List of scripts for a given content node.
	 * @param \WP_Dependencies      $wp_assets  A Global assets object.
	 *
	 * @return string[]
	 */
	protected function flatten_enqueued_assets_list( array $queue, $wp_assets ) {
		$registered_scripts = $wp_assets->registered;
		$handles            = [];
		foreach ( $queue as $handle ) {
			if ( empty( $registered_scripts[ $handle ] ) ) {
				continue;
			}

			/** @var \_WP_Dependency $script */
			$script    = $registered_scripts[ $handle ];
			$handles[] = $script->handle;

			$dependencies = $this->flatten_enqueued_assets_list( $script->deps, $wp_assets );
			if ( empty( $dependencies ) ) {
				continue;
			}

			array_unshift( $handles, ...$dependencies );
		}

		return array_values( array_unique( $handles ) );
	}

	/**
	 * Resolve the enqueued assets for an list of handles
	 *
	 * @param string   $type The type of asset to resolve
	 * @param string[] $asset_handles The list of asset handles to resolve
	 * @throws \GraphQL\Error\UserError If the asset type is invalid.
	 *
	 * @return string[]
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

	public function setup() {
		global $wp_query, $post;

		/**
		 * Store the global post before overriding
		 */
		$this->global_post = $post;

		$incoming_post = get_post( $this->data->ID );

		/**
		 * Set the resolving post to the global $post. That way any filters that
		 * might be applied when resolving fields can rely on global post and
		 * post data being set up.
		 */
		if ( $incoming_post instanceof \WP_Post ) {
			$id        = $incoming_post->ID;
			$post_type = $incoming_post->post_type;
			$post_name = $incoming_post->post_name;
			$data      = $incoming_post;

			/**
			 * Clear out existing postdata
			 */
			$wp_query->reset_postdata();

			/**
			 * Parse the query to tell WordPress how to
			 * setup global state
			 */
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
	 * Initializes the field resolvers.
	 */
	protected function init() {
		if ( empty( $this->fields ) ) {
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
					global $wp_scripts;

					// Simulate WP template rendering.
					ob_start();
					do_action( 'wp_head' );
					/**
					 * We only need to call "$this->data->contentRendered;" for the simulation,
					 * however it is being assigned to a variable to quiet phpstan.
					 */
					$this->data->contentRendered;
					$this->data->ID;

					do_action( 'get_sidebar', null, [] );
					do_action( 'wp_footer' );
					ob_get_clean();

					// Sort and organize the enqueued scripts.
					$queue = $this->flatten_enqueued_assets_list( $wp_scripts->queue ?? [], $wp_scripts );

					// Reset the scripts queue to avoid conflicts with other queries.
					$wp_scripts->reset();
					$wp_scripts->queue = [];

					return $queue;
				},
				'enqueuedStylesheetsQueue' => function () {
					global $wp_styles;

					// Simulate WP template rendering.
					ob_start();
					wp_head();
					/**
					 * We only need to call "$this->data->contentRendered;" for the simulation,
					 * however it is being assigned to a variable to quiet phpstan.
					 */
					$this->data->contentRendered;
					$this->data->ID;

					do_action( 'get_sidebar', null, [] );
					wp_footer();
					ob_get_clean();

					// Sort and organize the enqueued stylesheets.
					$queue = $this->flatten_enqueued_assets_list( $wp_styles->queue ?? [], $wp_styles );

					$wp_styles->reset();
					$wp_styles->queue = [];

					return $queue;
				},
			];
		}//end if
	}
}
