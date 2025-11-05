const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
  mode: 'development',
  target: 'web',
  entry: './src/renderer/index.tsx',
  devtool: 'inline-source-map',
  devServer: {
    port: 5001,
    hot: true,
    historyApiFallback: true
  },
  module: {
    rules: [
      { test: /\.(ts|tsx)$/, use: { loader: 'ts-loader', options: { transpileOnly: true, configFile: 'tsconfig.renderer.json' } }, exclude: /node_modules/ },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  },
  ignoreWarnings: [
    {
      module: /node_modules\/typescript/,
      message: /Critical dependency/,
    },
  ],
  resolve: { 
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@renderer': path.resolve(__dirname, 'src/renderer')
    },
    fallback: {
      "fs": false,
      "path": false,
      "os": false
    }
  },
  output: { filename: 'bundle.js', path: path.resolve(__dirname, 'dist/renderer'), clean: true },
  plugins: [
    new HtmlWebpackPlugin({ template: 'src/renderer/index.html' }),
    new MonacoWebpackPlugin()
  ]
};
