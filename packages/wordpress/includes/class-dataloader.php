<?php
/**
 * Class DataLoader - Defines the dataloader for the plugin.
 * 
 * @package NextPress\Uri_Assets  
 * @since 0.0.1
 */

namespace NextPress\Uri_Assets;

use WPGraphQL\Data\Loader\AbstractDataLoader;

class DataLoader extends AbstractDataLoader {
    /**
	 * Given array of keys, loads and returns a map consisting of keys from `keys` array and loaded
	 * posts as the values
	 *
	 * @param array $keys - array of URIs.
	 *
	 * @return array
	 * @throws \Exception Invalid loader type.
	 */
	public function loadKeys( array $keys ) {
        $loaded_items = [];

		/**
		 * Loop over the keys and return an array of items.
		 */
		foreach ( $keys as $key ) {
			$loaded_items[ $key ] = $this->load_asset_model_for_path( $key );
		}

		return ! empty( $loaded_items ) ? $loaded_items : [];
	}

    /**
     * Load the asset model for the given path.
     *
     * @param string $path - The path to the asset.
     *
     * @return Model
     */
    protected function load_asset_model_for_path( $path ) {
        return new Model( $path );
    }
}