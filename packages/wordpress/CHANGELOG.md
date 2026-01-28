# @axistaylor/nextpress-wordpress

## 1.0.2

### Patch Changes

- [#10](https://github.com/AxisTaylor/nextpress/pull/10) [`31da5e8`](https://github.com/AxisTaylor/nextpress/commit/31da5e81adf8b76c512471e959173bbec6326417) Thanks [@kidunot89](https://github.com/kidunot89)! - Problem: WooCommerce block scripts weren't being included in assetsByUri query results.

  Root Cause: WPGraphQL WooCommerce adds a filter making WC()->is_rest_api_request() return true for GraphQL requests.
  WooCommerce blocks check this in their render_callback() and skip enqueuing scripts when it returns true.

  Solution:

  - Added nextpress_pre_simulate_render and nextpress_post_simulate_render hooks in the Model class around the content rendering simulation
  - In Assets class, hooked into these to temporarily override the filter (making it return false) during simulation, then restore it afterward
  - Only activates when enable_custom_wc_scripts setting is enable

## 1.0.1

### Patch Changes

- [#8](https://github.com/AxisTaylor/nextpress/pull/8) [`b20b3e1`](https://github.com/AxisTaylor/nextpress/commit/b20b3e168adba9678e3d423caf8bcf50ff49d9d3) Thanks [@kidunot89](https://github.com/kidunot89)! - Documentation updated
