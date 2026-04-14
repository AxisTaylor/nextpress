<?php
/**
 * Session Customer Note block — server render.
 *
 * Renders a form that updates the WC customer billing first name via
 * wp.apiFetch (which handles proxy routing and nonce headers automatically).
 * Uses @wordpress/interactivity for state management.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 */
?>
<div
	<?php echo get_block_wrapper_attributes(); ?>
	data-wp-interactive="complex-blocks/session-customer-note"
	<?php echo wp_interactivity_data_wp_context( [
		'firstName' => '',
		'status'    => 'idle',
	] ); ?>
	data-testid="session-customer-note-block"
>
	<label>
		Billing First Name:
		<input
			type="text"
			data-wp-bind--value="context.firstName"
			data-wp-on--input="actions.updateField"
			data-testid="customer-note-input"
			style="padding: 4px 8px; margin-left: 8px;"
		/>
	</label>
	<button
		data-wp-on--click="actions.submit"
		data-testid="customer-note-submit"
		style="padding: 8px 16px; margin-left: 8px; cursor: pointer;"
	>
		Save
	</button>
	<span data-wp-text="context.status" data-testid="customer-note-status" style="margin-left: 8px;"></span>
</div>
