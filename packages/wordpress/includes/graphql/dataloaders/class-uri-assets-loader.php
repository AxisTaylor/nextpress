<?php
/**
 * Class Uri_Assets_Loader - DataLoader for URI asset resolution.
 *
 * @package NextPress\Uri_Assets\GraphQL\DataLoader
 * @since TBD
 */

namespace NextPress\Uri_Assets\GraphQL\DataLoader;

use WPGraphQL\Data\Loader\AbstractDataLoader;
use NextPress\Uri_Assets\GraphQL\Model\Uri_Assets;

class Uri_Assets_Loader extends AbstractDataLoader {
	/**
	 * Given array of keys, loads and returns a map consisting of keys from `keys` array and loaded
	 * models as the values.
	 *
	 * @param array $keys Array of URIs.
	 *
	 * @return array
	 * @throws \Exception Invalid loader type.
	 */
	public function loadKeys( array $keys ) {
		$loaded_items = [];

		foreach ( $keys as $key ) {
			$loaded_items[ $key ] = new Uri_Assets( $key );
		}

		return ! empty( $loaded_items ) ? $loaded_items : [];
	}
}
