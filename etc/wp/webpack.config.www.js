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
const TerserJSPlugin          = require('terser-webpack-plugin'),
      OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin'),
      lPack                   = require('layer-pack'),
      fs                      = require("fs"),
      webpack                 = require("webpack"),
      path                    = require("path"),
      HtmlWebpackPlugin       = require('html-webpack-plugin'),
      BundleAnalyzerPlugin    = require('webpack-bundle-analyzer').BundleAnalyzerPlugin,
      autoprefixer            = require('autoprefixer'),
      MiniCssExtractPlugin    = require('mini-css-extract-plugin'),
      HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

const lpackCfg   = lPack.getConfig(),
      isExcluded = lPack.isFileExcluded();

module.exports = [
    {
        mode: lpackCfg.vars.production ? "production" : "development",
        
        // The jsx App entry point
        entry    : {
            [ lpackCfg.vars.rootAlias ]: [
                ...( lpackCfg.vars.devServer && ['webpack/hot/dev-server'] || [] ),
                
                lpackCfg.vars.entryPoint ?
                lpackCfg.vars.entryPoint
                                         :
                lpackCfg.vars.rootAlias + "/index.client" // default to 'App'
            ]
        },
        devServer: lpackCfg.vars.devServer && {
            index             : '', //needed to enable root proxying
            contentBase       : lPack.getHeadRoot() + "/" + ( lpackCfg.vars.targetDir || 'dist' ),
            historyApiFallback: true,
            hot               : true,
            inline            : true,
            
            host : 'localhost', // Defaults to `localhost`
            port : 8080, // Defaults to 8080
            proxy: [{
                context: ['/**', '!/sockjs-node/**'],
                target : 'http://localhost:9701',
                ws     : true,
                secure : false                         // proxy websockets
            }]
        } || undefined,
        
        // The resulting build
        output      : {
            path      : lPack.getHeadRoot() + "/" + ( lpackCfg.vars.targetDir || 'dist' ),
            filename  : "[name].js",
            publicPath: "/",
        },
        optimization: {
            minimizer  : lpackCfg.vars.production && [
                new TerserJSPlugin(lpackCfg.vars.terserOptions || {}),
                new OptimizeCSSAssetsPlugin({
                                                //assetNameRegExp          :
                                                // /\.optimize\.css$/g,
                                                cssProcessor             : require('cssnano'),
                                                cssProcessorPluginOptions: {
                                                    preset: ['default', { discardComments: { removeAll: true } }],
                                                },
                                                canPrint                 : true
                                            })] || [],
            splitChunks: {
                cacheGroups: {
                    default: false,
                    vendors: {
                        // sync + async chunks
                        chunks  : 'all',
                        filename: lpackCfg.vars.rootAlias + ".vendors.js",
                        test    : ( f ) => {
                            return f.resource && lPack.isFileExcluded().test(f.resource)
                        },
                    },
                }
            }
        },
        
        // add sourcemap in a dedicated file (.map)
        devtool: !lpackCfg.vars.production && 'source-map',
        
        // required files resolving options
        resolve: {
            extensions: [
                ".",
                ".js",
                ".jsx",
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
                ...( lpackCfg.vars.extractCss && [
                    new MiniCssExtractPlugin({
                                                 // Options similar to the same options
                                                 // in webpackOptions.output both options
                                                 // are optional
                                                 filename: '[name].css',
                                                 //chunkFilename: '[id].css'
                                             })
                ] || [] ),
                new webpack.ContextReplacementPlugin(/moment[\/\\](lang|locale)$/, /^\.\/(fr|en|us)$/),
                
                //new HardSourceWebpackPlugin(),
                ...( fs.existsSync("./LICENCE.HEAD.MD") && [
                        new webpack.BannerPlugin(fs.readFileSync("./LICENCE.HEAD.MD").toString())
                    ] || []
                ),
                
                ...( ( lpackCfg.vars.indexTpl || lpackCfg.vars.HtmlWebpackPlugin ) && [
                        new HtmlWebpackPlugin({
                                                  template: lpackCfg.vars.indexTpl || ( lpackCfg.vars.rootAlias + '/index.html.tpl' ),
                                                  ...lpackCfg.vars.HtmlWebpackPlugin
                                              })
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
                
                ] || [new webpack.NamedModulesPlugin()] )
            ]
        ),
        
        
        // the requirable files and what manage theirs parsing
        module: {
            rules: [
                ...( lpackCfg.vars.devServer && [
                    {
                        test   : /\.jsx?$/,
                        loader : 'source-map-loader',
                        exclude: /react-hot-loader/
                    },
                    {
                        test   : /\.jsx?$/,
                        exclude: isExcluded,
                        use    : [
                            'react-hot-loader/webpack'
                        ]
                    }
                ] || [] ),
                {
                    test   : /\.jsx?$/,
                    exclude: lpackCfg.vars.babelInclude
                             ?
                             (
                                 includeRE => ( { test: path => ( isExcluded.test(path) && !includeRE.test(path) ) } )
                             )(new RegExp(lpackCfg.vars.babelInclude))
                             :
                             isExcluded,
                    use    : [
                        {
                            loader : 'babel-loader',
                            options: {
                                cacheDirectory: true, //important for performance
                                presets       : [
                                    ['@babel/preset-env',
                                     {
                                         ...( lpackCfg.vars.babelPreset || {} )
                                     }], "@babel/react"],
                                plugins       : [
                                    ["@babel/plugin-proposal-decorators", { "legacy": true }],
                                    ["@babel/plugin-transform-runtime", {}],
                                    ["@babel/plugin-proposal-optional-chaining", {}],
                                    ["@babel/proposal-class-properties", { loose: true }],
                                    "@babel/proposal-object-rest-spread",
                                    "@babel/plugin-syntax-dynamic-import",
                                    ...( lpackCfg.vars.devServer && [["react-hot-loader/babel", {}]] || [] ),
                                ]
                            }
                        },
                    ]
                },
                {
                    test: /\.(scss|css)$/,
                    use : lpackCfg.vars.extractCss ?
                          [
                              {
                                  loader : MiniCssExtractPlugin.loader,
                                  options: {
                                      // you can specify a publicPath here
                                      // by default it uses publicPath in
                                      // webpackOptions.output publicPath: '/',
                                      hmr: !lpackCfg.vars.production,
                                  },
                              },
                              { loader: 'css-loader', options: { importLoaders: 1 } },
                              {
                                  loader : 'postcss-loader',
                                  options: {
                                      postcssOptions: {
                                          plugins: function () {
                                              return [
                                                  autoprefixer({
                                                                   overrideBrowserslist: [
                                                                       '>1%',
                                                                       'last 4 versions',
                                                                       'Firefox ESR',
                                                                       'not ie < 9', // React
                                                                                     // doesn't
                                                                                     // support
                                                                                     // IE8
                                                                                     // anyway
                                                                   ]
                                                               }),
                                              ];
                                          }
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
                                                   :
                          [
                              "style-loader",
                              { loader: 'css-loader', options: { importLoaders: 1 } },
                              {
                                  loader : 'postcss-loader',
                                  options: {
                                      postcssOptions: {
                                          plugins: function () {
                                              return [
                                                  autoprefixer({
                                                                   overrideBrowserslist: [
                                                                       '>1%',
                                                                       'last 4 versions',
                                                                       'Firefox ESR',
                                                                       'not ie < 9', // React
                                                                                     // doesn't
                                                                                     // support
                                                                                     // IE8
                                                                                     // anyway
                                                                   ]
                                                               }),
                                              ];
                                          }
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
                    test: /\.tpl$/, loader:
                        "dot-tpl-loader?append=true"
                }
                ,
                
                {
                    test: /\.otf(\?.*$|$)$/, use:
                        "file-loader?name=assets/[hash].[ext]"
                }
                ,
                {
                    test  : /\.json?$/,
                    loader:
                        'strip-json-comments-loader'
                }
            ],
        },
    },
]