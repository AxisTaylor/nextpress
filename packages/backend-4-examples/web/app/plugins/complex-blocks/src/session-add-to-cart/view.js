/**
 * Session Add to Cart — classic view script.
 *
 * Reads product config from the inline `complexBlocksAddToCart` global
 * (injected via wp_add_inline_script) and adds the product to the WC
 * cart via wp.apiFetch, which routes through the NextPress proxy and
 * handles nonce headers automatically.
 */
( function () {
	var blocks = document.querySelectorAll(
		'.wp-block-complex-blocks-session-add-to-cart'
	);

	blocks.forEach( function ( block ) {
		var button = block.querySelector( '[data-testid="atc-button"]' );
		var status = block.querySelector( '[data-testid="atc-status"]' );
		if ( ! button || ! status ) return;

		var config = window.complexBlocksAddToCart;
		if ( ! config || ! config.productId ) {
			status.textContent = 'No product configured';
			return;
		}

		// Mark that the inline script data was received.
		block.setAttribute( 'data-config-loaded', 'true' );

		button.addEventListener( 'click', function () {
			button.disabled = true;
			status.textContent = 'Adding…';

			wp.apiFetch( {
				path: '/wc/store/v1/cart/add-item',
				method: 'POST',
				data: {
					id: config.productId,
					quantity: 1,
				},
			} )
				.then( function () {
					status.textContent = 'Added!';
					block.setAttribute( 'data-added', 'true' );
				} )
				.catch( function ( err ) {
					status.textContent = 'Error: ' + ( err.message || err );
					button.disabled = false;
				} );
		} );
	} );
} )();
