---
"@axistaylor/nextpress-wordpress": patch
---

Problem: WooCommerce block scripts weren't being included in assetsByUri query results.

Root Cause: WPGraphQL WooCommerce adds a filter making WC()->is_rest_api_request() return true for GraphQL requests.  
WooCommerce blocks check this in their render_callback() and skip enqueuing scripts when it returns true.

Solution:

- Added nextpress_pre_simulate_render and nextpress_post_simulate_render hooks in the Model class around the content rendering simulation
- In Assets class, hooked into these to temporarily override the filter (making it return false) during simulation, then restore it afterward
- Only activates when enable_custom_wc_scripts setting is enable
