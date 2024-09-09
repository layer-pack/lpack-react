/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

const lPack                = require('layer-pack'),
      fs                   = require("fs"),
      webpack              = require("webpack"),
      path                 = require("path"),
      BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const lpackCfg   = lPack.getConfig(),
      isExcluded = lPack.isFileExcluded();

module.exports = [
	{
		mode   : lpackCfg.vars.production ? "production" : "development",
		entry  : {
			App: [
				lpackCfg.vars.rootAlias + '/index.server'
			] // default to 'App'
		},
		target : 'async-node',
		output : {
			path         : lPack.getHeadRoot() + "/" + (lpackCfg.vars.targetDir || 'dist'),
			filename     : "[name].server.js",
			publicPath   : "/",
			libraryTarget: "commonjs2"
		},
		devtool: 'source-map',
		
		resolve: {
			symlinks  : false,
			extensions: [
				".",
				".api.js",
				".api.jsx",
				".js",
				".jsx",
				".json",
				".scss",
				".css",
			],
		},
		
		module : {
			rules: [
				{
					test   : /\.jsx?$/,
					exclude: isExcluded,
					use    : [
						{
							loader : 'babel-loader',
							options: {
								cacheDirectory: true, //important for performance
								presets       : [
									['@babel/preset-env',
										{
											...(lpackCfg.vars.babelPreset || {})
										}],
									'@babel/preset-react'
								],
								plugins       : [
									["@babel/plugin-proposal-decorators", { "legacy": true }],
									['@babel/plugin-transform-class-properties', {
										//"loose": true
									}],
									["@babel/plugin-transform-runtime", {}],
								]
							}
						},
					]
				},
				{
					test: /\.(png|jpg|gif|svg|woff2|ttf|eot)(\?.*$|$)$/,
					use : 'file-loader?limit=8192&name=assets/[hash].[ext]'
				},
				{
					test: /\.woff2?(\?.*$|$)$/,
					use : "url-loader?prefix=font/&limit=5000&mimetype=application/font-woff&name=assets/[hash].[ext]"
				},
				{ test: /\.html$/, use: "file-loader?name=[name].[ext]" },
				{ test: /\.tpl$/, use: "dot-tpl-loader?append=true" },
				{
					test: /\.(scss|css|less)(\?.*$|$)$/,
					use : 'null-loader'
				},
				
				{ test: /\.otf(\?.*$|$)$/, use: "file-loader?name=assets/[hash].[ext]" },
				{
					test: /\.json?$/,
					use : 'strip-json-comments-loader'
				}
			],
		},
		plugins:
			[
				lPack.plugin(),
				
				//new HardSourceWebpackPlugin(),
				...(fs.existsSync("./LICENCE.HEAD.MD") && [
						new webpack.BannerPlugin(fs.readFileSync("./LICENCE.HEAD.MD").toString())
					] || []
				),
				
				...(lpackCfg.vars.production && [
					new BundleAnalyzerPlugin({
						                         analyzerMode  : 'static',
						                         reportFilename: './' + lpackCfg.vars.rootAlias + '.stats.html',
						                         openAnalyzer  : false,
						                         ...lpackCfg.vars.BundleAnalyzerPlugin
					                         })
				
				] || [])
			],
	}
]
