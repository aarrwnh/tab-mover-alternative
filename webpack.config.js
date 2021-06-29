const path = require("path");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const WebpackHookPlugin = require("webpack-hook-plugin");
const sveltePreprocess = require("svelte-preprocess");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

/**
 * @param {import("process")["env"]} _env 
 * @param {import("webpack").Configuration} argv 
 * @returns {import("webpack").Configuration}
 */
module.exports = (_env, argv) => {
	// const mode = process.env.NODE_ENV || "development";
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
			options: "/src/options/main.js"
		},

		stats: {
			entrypoints: false
		},

		output: {
			filename: (pathData) => {
				return pathData.runtime === "background"
					? "background.js"
					: "[name]/index.js";
			},
			path: path.resolve(__dirname, "dist")
		},

		optimization: {
			concatenateModules: false,
			minimize: isProduction,
			moduleIds: isProduction ? "natural" : "named",
			removeEmptyChunks: true,
			minimizer
		},

		resolve: {
			extensions: [".ts", ".svelte"],
			alias: {
				svelte: path.dirname(require.resolve("svelte/package.json"))
			},
			mainFields: ["svelte", "browser", "module", "main"]
		},

		module: {
			rules: [
				{
					test: /\.svelte$/,
					use: {
						loader: "svelte-loader",
						options: {
							compilerOptions: {
								dev: !isProduction
							},
							// emitCss: isProduction,
							// hotReload: !isProduction,
							preprocess: sveltePreprocess({ sourceMap: !isProduction })

						}
					}
				},
				{
					test: /\.tsx?$/,
					loader: "ts-loader",
					exclude: /node_modules/,
					options: {
						transpileOnly: true
					}
				},
				{
					// required to prevent errors from Svelte on Webpack 5+
					test: /node_modules\/svelte\/.*\.mjs$/,
					resolve: {
						fullySpecified: false
					}
				}
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
			new ForkTsCheckerWebpackPlugin()
		],

		watchOptions: {
			aggregateTimeout: 1000,
			ignored: ["**/src/manifest.json", "**/src/*.tmp", "node_modules"],
		}
	};
};
