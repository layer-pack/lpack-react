/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

const lPack                   = require('layer-pack'),
      fs                      = require("fs"),
      webpack                 = require("webpack"),
      path                    = require("path"),
      HtmlWebpackPlugin       = require('html-webpack-plugin'),
      BundleAnalyzerPlugin    = require('webpack-bundle-analyzer').BundleAnalyzerPlugin,
      HardSourceWebpackPlugin = require('hard-source-webpack-plugin'),
      autoprefixer            = require('autoprefixer'),
      ReactRefreshPlugin      = require('@pmmmwh/react-refresh-webpack-plugin');


const lpackCfg   = lPack.getConfig(),
      isExcluded = lPack.isFileExcluded();

module.exports = [
    {
        mode: lpackCfg.vars.production ? "production" : "development",
        
        // The jsx App entry point
        entry: {
            
            [ lpackCfg.vars.rootAlias ]: [
                ...( lpackCfg.vars.devServer && ['webpack/hot/dev-server'] || [] ),
                
                lpackCfg.vars.entryPoint ?
                lpackCfg.vars.entryPoint
                                         :
                lpackCfg.vars.rootAlias + "/index" // default to 'App'
            ]
        },
        
        // The resulting build
        output: {
            path           : lPack.getHeadRoot() + "/" + ( lpackCfg.vars.targetDir || 'dist' ),
            filename       : "[name].js",
            publicPath     : "/",
            "libraryTarget": "commonjs-module"
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
                ...( ( lpackCfg.vars.indexTpl || lpackCfg.vars.HtmlWebpackPlugin ) && [
                        new HtmlWebpackPlugin({
                                                  template: lpackCfg.vars.indexTpl || ( lpackCfg.vars.rootAlias + '/index.html.tpl' ),
                                                  ...lpackCfg.vars.HtmlWebpackPlugin
                                              })
                    ] || []
                ),
                ...(lpackCfg.vars.devServer && [
                    new ReactRefreshPlugin({})
                ] || []),
                ...( fs.existsSync("./LICENCE.HEAD.MD") && [
                        new webpack.BannerPlugin(fs.readFileSync("./LICENCE.HEAD.MD").toString())
                    ] || []
                ),
                
                ...( lpackCfg.vars.production && [
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
                
                ] || [] )
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
                                    ...(lpackCfg.vars.devServer && [['react-refresh/babel', {}]] || []),
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
