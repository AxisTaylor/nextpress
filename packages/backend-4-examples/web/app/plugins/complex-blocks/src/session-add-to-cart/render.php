<?php
/**
 * Session Add to Cart block — server render.
 *
 * Renders a button that adds a product to the WC cart via wp.apiFetch.
 * The product ID is passed as inline script data via wp_add_inline_script.
 * The view script uses wp.apiFetch (which handles proxy routing and nonce
 * headers automatically) rather than raw fetch with hardcoded URLs.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 */

$product_id = absint( $attributes['productId'] ?? 0 );

// If no product ID is set, try to find the first simple product.
if ( 0 === $product_id && function_exists( 'wc_get_products' ) ) {
	$products = wc_get_products( [
		'type'   => 'simple',
		'limit'  => 1,
		'status' => 'publish',
		'return' => 'ids',
	] );
	if ( ! empty( $products ) ) {
		$product_id = $products[0];
	}
}

$product_name = $product_id ? get_the_title( $product_id ) : 'Unknown';

// Pass the product ID to the view script via inline data.
$handle = 'complex-blocks-session-add-to-cart-view-script';
wp_add_inline_script(
	$handle,
	sprintf(
		'var complexBlocksAddToCart = %s;',
		wp_json_encode( [
			'productId'   => $product_id,
			'productName' => $product_name,
		] )
	),
	'before'
);
?>
<div
	<?php echo get_block_wrapper_attributes(); ?>
	data-testid="session-add-to-cart-block"
	data-product-id="<?php echo esc_attr( $product_id ); ?>"
>
	<p>Product: <strong data-testid="atc-product-name"><?php echo esc_html( $product_name ); ?></strong></p>
	<button
		data-testid="atc-button"
		style="padding: 8px 16px; cursor: pointer;"
	>
		Add to Cart
	</button>
	<span data-testid="atc-status" style="margin-left: 8px;"></span>
</div>
