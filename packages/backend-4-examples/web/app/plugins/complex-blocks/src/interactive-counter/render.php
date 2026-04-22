<?php
/**
 * Interactive Counter block — server render.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 */

$label = esc_html( $attributes['label'] ?? 'Count' );

$context = wp_json_encode( [ 'count' => 0 ] );
?>
<div
	<?php echo get_block_wrapper_attributes(); ?>
	data-wp-interactive="complex-blocks/interactive-counter"
	<?php echo wp_interactivity_data_wp_context( [ 'count' => 0 ] ); ?>
>
	<button
		data-wp-on--click="actions.increment"
		data-testid="counter-button"
		class="wp-element-button"
	>
		<span data-testid="counter-label"><?php echo $label; ?>:</span>
		<span data-wp-text="context.count" data-testid="counter-value">0</span>
	</button>
</div>
