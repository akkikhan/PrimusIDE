const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
  mode: 'production',
  target: 'web',
  entry: './src/renderer/index.tsx',
  module: {
    rules: [
      { test: /\.(ts|tsx)$/, use: { loader: 'ts-loader', options: { configFile: 'tsconfig.renderer.json' } }, exclude: /node_modules/ },
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
