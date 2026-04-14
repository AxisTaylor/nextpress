const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const MiniCSSExtractPlugin = require( 'mini-css-extract-plugin' );
const defaults = require('@wordpress/scripts/config/webpack.config.js');

const pluginSrc = path.resolve( process.cwd(), 'web/app/plugins/complex-blocks/src' );
const pluginDist = path.resolve( process.cwd(), 'web/app/plugins/complex-blocks/dist' );

const entries = [
  {
    name: 'deferred-view',
    import: path.resolve( pluginSrc, 'deferred-view', 'view.js' ),
    output: path.resolve( pluginDist, 'deferred-view' ),
    isModule: false,
  },
  {
    name: 'interactive-counter',
    import: path.resolve( pluginSrc, 'interactive-counter', 'view.ts' ),
    output: path.resolve( pluginDist, 'interactive-counter' ),
    isModule: true,
  },
  {
    name: 'interactive-toggle',
    import: path.resolve( pluginSrc, 'interactive-toggle', 'view.ts' ),
    output: path.resolve( pluginDist, 'interactive-toggle' ),
    isModule: true,
  },
  {
    name: 'session-add-to-cart',
    import: path.resolve( pluginSrc, 'session-add-to-cart', 'view.js' ),
    output: path.resolve( pluginDist, 'session-add-to-cart' ),
    isModule: false,
  },
  {
    name: 'session-customer-note',
    import: path.resolve( pluginSrc, 'session-customer-note', 'view.ts' ),
    output: path.resolve( pluginDist, 'session-customer-note' ),
    isModule: true,
  },
];

const config = [];
for (const entry of entries) {
  config.push({
    ...defaults,
    entry: { [entry.name]: entry.import },
    output: {
      filename: 'view.js',
      path: entry.output,
      ...(entry.isModule ? { module: true } : {}),
    },
    ...(entry.isModule ? { experiments: { outputModule: true } } : {}),
    module: {
      ...defaults.module,
      rules: [
        ...defaults.module.rules,
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: 'tsconfig.json',
                transpileOnly: true,
              }
            }
          ]
        }
      ]
    },
    plugins: [
      ...defaults.plugins,
      new CopyPlugin({
        patterns: entries.flatMap(({ name }) => {
          const srcDir = path.resolve( __dirname, 'web/app/plugins/complex-blocks/src', name );
          const distDir = path.resolve( __dirname, 'web/app/plugins/complex-blocks/dist', name );
          return [
            { from: path.resolve( srcDir, 'block.json' ), to: path.resolve( distDir, 'block.json' ) },
            { from: path.resolve( srcDir, 'render.php' ), to: path.resolve( distDir, 'render.php' ), noErrorOnMissing: true },
          ];
        }),
      }),
      new MiniCSSExtractPlugin({
        filename: ({ chunk }) => `${chunk.name.replace("/js/", "/css/")}.css`
      }),
    ],
    resolve: {
      plugins: [new TsconfigPathsPlugin()],
      extensions: [ '.ts', '.tsx', ...(defaults.resolve ? defaults.resolve.extensions || ['.js', '.jsx'] : [])]
    },
    devtool: 'source-map',
  })
}

module.exports = config;
