<?php
/**
 * Deferred View Script block — server render.
 *
 * Renders a placeholder. The view script (classic, deferred) adds a
 * data-initialized attribute and swaps the text once the DOM is ready.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 */
?>
<div
	<?php echo get_block_wrapper_attributes(); ?>
	data-testid="deferred-view-block"
>
	<p data-testid="deferred-view-text">Waiting for script…</p>
</div>
