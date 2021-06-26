/* eslint-disable */
const path = require("path");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin")
const WebpackHookPlugin = require("webpack-hook-plugin");

/**
 * @param {process["env"]} env 
 * @param {import("webpack").Configuration} argv 
 * @returns {import("webpack").Configuration}
 */
module.exports = (_env, argv) => {
	const isProduction = "production" === argv.mode;

	const minimizer = argv.mode === "production"
		? [
			new TerserPlugin({
				test: /\.js(\?.*)?$/i,
				parallel: true,
				terserOptions: {
					ecma: 2020,
					compress: false,
					output: {
						comments: /^!/,
						beautify: false,
						ascii_only: true,
					}
				}
			}),
		]
		: [];

	return {
		mode: argv.mode ?? "production",
		devtool: false,
		entry: {
			background: "/src/background/index.ts",
			// TODO: options in svelte?
		},
		stats: {
			entrypoints: false
		},
		output: {
			filename: "[name].js",
			path: path.resolve(__dirname, "dist"),
		},
		optimization: {
			minimize: isProduction,
			moduleIds: isProduction ? "natural" : "named",
			removeEmptyChunks: true,
			minimizer
		},
		resolve: {
			extensions: [".ts", ".tsx"]
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					loader: "ts-loader",
					options: {
						transpileOnly: true,
					},
					exclude: /node_modules/,
				},
			],
		},
		plugins: [
			new WebpackHookPlugin({
				onCompile: [
					"echo \x1B[2J\x1B[3J\x1B[H" // clear terminal
				],
				onBuildExit: [
					"echo.",
				]
			}),
			new webpack.optimize.LimitChunkCountPlugin({
				maxChunks: 1
			}),
		],
		watchOptions: {
			poll: 1000,
			ignored: ["**/src/manifest.json", "**/src/*.tmp"]
		},
	};
};