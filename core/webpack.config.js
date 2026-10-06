const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const {version} = require('./package.json');

module.exports = {
	mode: 'production',
	devtool: 'source-map',
	entry: './src/lib/index.ts',
	output: {
		filename: 'index.js',
		path: path.resolve(__dirname, 'build'),
		// Exposed as the `BigBrowser` global when evaluated as a plain script (extension user-script world),
		// still importable as a module (UMD) for tooling and plugin type-checking.
		library: {
			name: 'BigBrowser',
			type: 'umd',
		},
		globalObject: 'globalThis',
		clean: true,
	},
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				extractComments: false,
			}),
		],
	},
	module: {
		rules: [
			{
				test: /\.(m|j|t)s$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
				},
			},
		],
	},
	plugins: [
		new webpack.DefinePlugin({
			__BIGBROWSER_VERSION__: JSON.stringify(version),
		}),
		new webpack.BannerPlugin({
			banner: `Big Browser core v${version} - https://github.com/jr-k/bigbrowser-extension`,
		}),
	],
	resolve: {
		extensions: ['.ts', '.js', '.json'],
	},
};
