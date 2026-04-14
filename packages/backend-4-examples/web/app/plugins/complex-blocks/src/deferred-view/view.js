/**
 * Deferred View Script — classic script (not a module).
 *
 * Runs after DOM parsing (WordPress registers viewScripts with defer).
 * Marks the block element with data-initialized="true" and updates the text.
 * E2E tests assert this attribute to confirm deferred execution timing.
 */
( function () {
	var blocks = document.querySelectorAll(
		'.wp-block-complex-blocks-deferred-view'
	);

	blocks.forEach( function ( block ) {
		block.setAttribute( 'data-initialized', 'true' );

		var text = block.querySelector( '[data-testid="deferred-view-text"]' );
		if ( text ) {
			text.textContent = 'Script loaded!';
		}
	} );
} )();
