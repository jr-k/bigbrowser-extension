const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const {version} = require('./package.json');

module.exports = {
	mode: 'development',
	devtool: 'cheap-module-source-map',
	entry: './src/sandbox/index.ts',
	output: {
		filename: 'index.js',
	},
	optimization: {
		minimize: false,
	},
	devServer: {
		open: true,
		hot: true,
		host: 'localhost',
		port: 9000,
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
		new HtmlWebpackPlugin({title: 'Big Browser - Sandbox'}),
	],
	resolve: {
		extensions: ['.ts', '.js', '.json'],
	},
};
