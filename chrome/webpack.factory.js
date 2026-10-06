/**
 * Shared webpack configuration for the Chrome and Firefox extensions.
 * Both targets compile the same sources (chrome/src); only the manifest and the `target` flag differ.
 */
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const SRC = path.resolve(__dirname, 'src');
const CORE_BUILD = path.resolve(__dirname, '../core/build');

module.exports = ({target, dir}) => {
	const {version} = require(path.join(dir, 'package.json'));

	return (env, argv) => {
		const production = argv.mode !== 'development';

		return {
			mode: production ? 'production' : 'development',
			devtool: production ? false : 'inline-source-map',
			context: __dirname,
			entry: {
				background: path.join(SRC, 'background.ts'),
				options: path.join(SRC, 'options/options.ts'),
				popup: path.join(SRC, 'popup/popup.ts'),
			},
			output: {
				path: path.join(dir, 'dist'),
				filename: '[name].js',
				clean: true,
			},
			optimization: {
				// Keep one file per entry: extension pages reference them directly
				splitChunks: false,
				runtimeChunk: false,
			},
			module: {
				rules: [
					{
						test: /\.ts$/,
						loader: 'ts-loader',
						options: {
							configFile: path.resolve(__dirname, 'tsconfig.json'),
						},
						exclude: /node_modules/,
					},
				],
			},
			resolve: {
				extensions: ['.ts', '.js'],
			},
			plugins: [
				new webpack.DefinePlugin({
					__BIGBROWSER_TARGET__: JSON.stringify(target),
					__BIGBROWSER_VERSION__: JSON.stringify(version),
				}),
				new CopyWebpackPlugin({
					patterns: [
						{from: path.join(dir, 'manifest.json'), to: 'manifest.json'},
						{from: path.join(SRC, 'options/options.html'), to: 'options.html'},
						{from: path.join(SRC, 'options/options.css'), to: 'options.css'},
						{from: path.join(SRC, 'popup/popup.html'), to: 'popup.html'},
						{from: path.join(SRC, 'popup/popup.css'), to: 'popup.css'},
						{from: path.join(SRC, 'ui/theme.css'), to: 'theme.css'},
						{from: path.join(SRC, 'ui/fonts'), to: 'fonts'},
						{from: path.resolve(__dirname, 'icons'), to: 'icons'},
						// Core runtime injected before every plugin bundle (see src/lib/engine.ts)
						{from: path.join(CORE_BUILD, 'index.js'), to: 'runtime.js'},
					],
				}),
			],
		};
	};
};
