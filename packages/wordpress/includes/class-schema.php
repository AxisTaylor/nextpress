<?php
/**
 * Class Schema
 *
 * @package NextPress\Uri_Assets;
 * @since 0.0.1
 */

namespace NextPress\Uri_Assets;

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
		$this->includes();
		add_action( 'graphql_register_types', [ $this, 'register_schema' ], 5 );
	}

	/**
	 * Load type registration files.
	 *
	 * @return void
	 */
	private function includes() {
		$graphql_path = \NextPress\get_includes_directory() . 'graphql/';
		$types_path   = $graphql_path . 'types/';

		// Utils.
		require_once $graphql_path . 'utils/class-wp-assets.php';
		require_once $graphql_path . 'utils/class-nextpress-script-modules.php';

		// DataLoaders.
		require_once $graphql_path . 'dataloaders/class-uri-assets-loader.php';

		// Models.
		require_once $graphql_path . 'models/class-uri-assets.php';

		// Enums.
		require_once $types_path . 'enum/class-script-loading-group-enum.php';
		require_once $types_path . 'enum/class-script-type-enum.php';
		require_once $types_path . 'enum/class-import-map-scheme-enum.php';

		// Object types and field extensions.
		require_once $types_path . 'object/class-enqueued-asset-fields.php';
		require_once $types_path . 'object/class-wp-import.php';
		require_once $types_path . 'object/class-uri-assets.php';
		require_once $types_path . 'object/class-global-styles.php';
		require_once $types_path . 'object/class-content-node-fields.php';
		require_once $types_path . 'object/class-root-query.php';
	}

	/**
	 * Register the schema
	 *
	 * @return void
	 */
	public function register_schema() {
		Type\Enum\Script_Loading_Group_Enum::register();
		Type\Enum\Script_Type_Enum::register();
		Type\Enum\Import_Map_Scheme_Enum::register();
		Type\Object\WP_Import::register();
		Type\Object\Enqueued_Asset_Fields::register();
		Type\Object\Uri_Assets::register();
		Type\Object\Global_Styles::register();
		Type\Object\Content_Node_Fields::register();
		Type\Object\Root_Query::register();
	}
}
