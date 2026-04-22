<?php
/**
 * Interactive Toggle block — server render.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 */
?>
<div
	<?php echo get_block_wrapper_attributes(); ?>
	data-wp-interactive="complex-blocks/interactive-toggle"
	<?php echo wp_interactivity_data_wp_context( [ 'isOpen' => false ] ); ?>
>
	<button
		data-wp-on--click="actions.toggle"
		data-testid="toggle-button"
		class="wp-element-button"
	>
		<span data-wp-text="state.buttonLabel">Show content</span>
	</button>
	<div
		data-wp-bind--hidden="!context.isOpen"
		data-testid="toggle-content"
		hidden
		style="margin-top: 8px; padding: 12px; border: 1px solid #ccc;"
	>
		<p>This content is toggled by the Interactivity API.</p>
	</div>
</div>
