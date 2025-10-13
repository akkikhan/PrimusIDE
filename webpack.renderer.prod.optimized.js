const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: 'production',
  target: 'web',
  entry: './src/renderer/index.tsx',
  
  module: {
    rules: [
      { 
        test: /\.(ts|tsx)$/, 
        use: { 
          loader: 'ts-loader', 
          options: { 
            configFile: 'tsconfig.renderer.json',
            transpileOnly: true, // Faster builds
            compilerOptions: {
              module: 'esnext'
            }
          } 
        }, 
        exclude: /node_modules/ 
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.(ttf|woff|woff2|eot)$/, type: 'asset/resource' }
    ]
  },
  
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.debug'],
          },
          mangle: true,
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        monaco: {
          test: /[\\/]node_modules[\\/]monaco-editor/,
          name: 'monaco-editor',
          priority: 20,
          chunks: 'async', // Load Monaco asynchronously
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)/,
          name: 'react-vendor',
          priority: 15,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    usedExports: true, // Tree shaking
    sideEffects: false,
  },
  
  performance: {
    maxEntrypointSize: 512000, // 500KB warning for entry
    maxAssetSize: 512000, // 500KB warning per asset
    hints: 'warning',
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
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      // Prevent bundling Node modules
      'electron': false,
      'fs': false,
      'path': false,
      'os': false,
      'crypto': false,
      'stream': false,
      'buffer': false,
    },
    fallback: {
      "fs": false,
      "path": false,
      "os": false,
      "crypto": false,
      "stream": false,
      "buffer": false,
    }
  },
  
  externals: {
    // Don't bundle electron
    electron: 'commonjs electron',
    // Don't bundle native modules
    'node-pty': 'commonjs node-pty',
    'nsfw': 'commonjs nsfw',
    'spdlog': 'commonjs spdlog',
  },
  
  output: { 
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    path: path.resolve(__dirname, 'dist/renderer'),
    clean: true,
    publicPath: './',
  },
  
  plugins: [
    new HtmlWebpackPlugin({ 
      template: 'src/renderer/index.html',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
      },
    }),
    new MonacoWebpackPlugin({
      // Only include languages you actually use
      languages: ['typescript', 'javascript', 'css', 'html', 'json', 'markdown', 'python'],
      features: [
        // Only include features you need
        'bracketMatching',
        'caretOperations', 
        'clipboard',
        'codeAction',
        'codelens',
        'colorPicker',
        'comment',
        'contextmenu',
        'coreCommands',
        'cursorUndo',
        'dnd',
        'find',
        'folding',
        'fontZoom',
        'format',
        'hover',
        'inPlaceReplace',
        'indentation',
        'links',
        'multicursor',
        'parameterHints',
        'quickCommand',
        'quickOutline',
        'referenceSearch',
        'rename',
        'smartSelect',
        'snippets',
        'suggest',
        'wordHighlighter',
        'wordOperations',
        'wordPartOperations',
      ],
    }),
    // Uncomment to analyze bundle
    // new BundleAnalyzerPlugin({
    //   analyzerMode: 'static',
    //   reportFilename: 'bundle-report.html',
    //   openAnalyzer: false,
    // }),
  ],
  
  devtool: false, // No source maps in production
};
