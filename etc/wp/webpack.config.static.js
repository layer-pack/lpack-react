/*
 *   The MIT License (MIT)
 *   Copyright (c) 2019. Wise Wild Web
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *   SOFTWARE.
 *
 *   @author : Nathanael Braun
 *   @contact : n8tz.js@gmail.com
 */

const lPack                = require('layer-pack'),
      fs                   = require("fs"),
      webpack              = require("webpack"),
      HtmlWebpackPlugin    = require('html-webpack-plugin'),
      autoprefixer         = require('autoprefixer'),
      lpackCfg             = lPack.getConfig(),
      isExcluded           = lPack.isFileExcluded(),
      BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin,
      MiniCssExtractPlugin = require('mini-css-extract-plugin'),
      devServerPort        = process.env.DEV_SERVER_PORT || 8080,
      proxyTo              = process.env.API_PORT || 9701;

module.exports = [
	{
		mode: lpackCfg.vars.production ? "production" : "development",
		
		// The jsx App entry point
		entry    : {
			[lpackCfg.vars.rootAlias]: [
				...(lpackCfg.vars.devServer && ['webpack/hot/dev-server'] || []),
				
				lpackCfg.vars.entryPoint ?
				lpackCfg.vars.entryPoint
				                         :
				lpackCfg.vars.rootAlias  // default to 'App'
			]
		},
		devServer: lpackCfg.vars.devServer && {
			hot : true,
			host: '127.0.0.1', // Defaults to `localhost`
			port: devServerPort, // Defaults to 8080
			//contentBase       : './dist/wwwDev',
			allowedHosts      : 'all',
			historyApiFallback: {
				disableDotRule: true,
			},
			//index             : '', //needed to enable root proxying
			//contentBase       : lPack.getHeadRoot() + "/" + (lpackCfg.vars.targetDir || 'dist'),
		} || undefined,
		
		// The resulting build
		output: {
			path    : lPack.getHeadRoot() + "/" + (lpackCfg.vars.targetDir || 'dist'),
			filename: "[name].js",
			//publicPath: "/",
		},
		
		// add sourcemap in a dedicated file (.map)
		devtool: !lpackCfg.vars.production && 'source-map',
		
		cache: {
			type                 : "filesystem",
			allowCollectingMemory: true,
			//cacheDirectory       : lPack.getHeadRoot() + "/" + (lpackCfg.vars.targetDir || 'dist') + "/cache",
		},
		
		// required files resolving options
		resolve: {
			cache     : false,// requiered for module cache to create indexes
			mainFields: ['browser', 'main', 'module'],
			extensions: [
				".",
				".js",
				".json",
				".scss",
				".css",
			],
			alias     : lpackCfg.vars.devServer && {
				'react-dom': '@hot-loader/react-dom'
			},
		},
		
		// Global build plugin & option
		plugins: (
			[
				lPack.plugin(),
				
				//new HardSourceWebpackPlugin(),
				...(lpackCfg.vars.extractCss && [
					new MiniCssExtractPlugin({
						                         // Options similar to the same options
						                         // in webpackOptions.output both options
						                         // are optional
						                         filename: '[name].css',
						                         //chunkFilename: '[id].css'
					                         })
				] || []),
				...(fs.existsSync("./LICENCE.HEAD.MD") && [
						new webpack.BannerPlugin(fs.readFileSync("./LICENCE.HEAD.MD").toString())
					] || []
				),
				
				...(lpackCfg.vars.production && [
					new webpack.DefinePlugin({
						                         'process.env': {
							                         'NODE_ENV': JSON.stringify('production')
						                         }
					                         }),
					new BundleAnalyzerPlugin({
						                         analyzerMode  : 'static',
						                         reportFilename: './' + lpackCfg.vars.rootAlias + '.stats.html',
						                         openAnalyzer  : false,
						                         ...lpackCfg.vars.BundleAnalyzerPlugin
					                         })
				
				] || []),
				...((lpackCfg.vars.indexTpl || lpackCfg.vars.HtmlWebpackPlugin) && [
						new HtmlWebpackPlugin({
							                      template: lpackCfg.vars.indexTpl || (lpackCfg.vars.rootAlias + '/index.html.tpl'),
							                      ...lpackCfg.vars.HtmlWebpackPlugin
						                      })
					] || []
				),
			]
		),
		
		
		// the requirable files and what manage theirs parsing
		module: {
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
									['@babel/plugin-proposal-class-properties', {
										"loose": true
									}],
									["@babel/plugin-transform-runtime", {}],
								]
							}
						},
					]
				},
				{
					test: /\.(scss|css)$/,
					use : [
						"style-loader",
						{ loader: 'css-loader', options: { importLoaders: 1 } },
						{
							loader : 'postcss-loader',
							options: {
								postcssOptions: {
									plugins: [
										[
											autoprefixer({
												             overrideBrowserslist: [
													             '>1%',
													             'last 4 versions',
													             'Firefox ESR',
													             'not ie < 9', // React doesn't support IE8 anyway
												             ]
											             }),
										]]
									
								}
							}
						},
						{
							loader : "sass-loader",
							options: {
								sassOptions: {
									importer  : lPack.plugin().sassImporter(),
									sourceMaps: true
								},
							}
						}
					]
				},
				{
					test: /\.(png|jpg|gif|svg)(\?.*$|$)$/,
					use :
						'file-loader?limit=8192&name=assets/[hash].[ext]'
				}
				,
				{
					test: /\.woff2?(\?.*$|$)$/,
					use :
						"url-loader?prefix=font/&limit=5000&mimetype=application/font-woff&name=assets/[hash].[ext]"
				}
				,
				{
					test: /\.ttf(\?.*$|$)$/, use:
						"file-loader?name=assets/[hash].[ext]"
				}
				,
				{
					test: /\.eot(\?.*$|$)$/, use:
						"file-loader?name=assets/[hash].[ext]"
				}
				,
				{
					test: /\.html$/, use:
						"file-loader?name=[name].[ext]"
				}
				,
				
				{
					test: /\.otf(\?.*$|$)$/, use:
						"file-loader?name=assets/[hash].[ext]"
				}
				,
				{
					test: /\.json?$/,
					use :
						'strip-json-comments-loader'
				}
			],
		},
	},
]