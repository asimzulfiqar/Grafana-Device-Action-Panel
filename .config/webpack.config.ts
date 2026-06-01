import CopyWebpackPlugin from 'copy-webpack-plugin';
import path from 'path';
import type { Configuration } from 'webpack';

const config = (_env: Record<string, unknown>): Configuration => ({
  mode: _env.production ? 'production' : 'development',
  context: path.resolve(process.cwd(), 'src'),
  devtool: _env.production ? 'source-map' : 'eval-source-map',
  entry: {
    module: './module.tsx',
    'device-action-panel/module': './device-action-panel/module.tsx',
  },
  externals: [
    'react',
    'react-dom',
    /^@grafana\/data/i,
    /^@grafana\/runtime/i,
    /^@grafana\/ui/i,
  ],
  module: {
    rules: [
      {
        test: /\.[tj]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              target: 'es2020',
              parser: { syntax: 'typescript', tsx: true },
              transform: { react: { runtime: 'automatic' } },
            },
          },
        },
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  output: {
    clean: {
      keep: /(.*?_(amd64|arm(64)?)(\.exe)?|go_plugin_build_manifest)/,
    },
    filename: '[name].js',
    library: { type: 'amd' },
    path: path.resolve(process.cwd(), 'dist'),
    publicPath: 'public/plugins/asim-device-action-app/',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'plugin.json', to: 'plugin.json' },
        { from: 'device-action-panel/plugin.json', to: 'device-action-panel/plugin.json' },
        { from: 'img', to: 'img' },
        { from: '../README.md', to: 'README.md' },
      ],
    }),
  ],
  resolve: { extensions: ['.ts', '.tsx', '.js'] },
});

export default config;
