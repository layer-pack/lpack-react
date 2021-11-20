# lpack-react

A inheritable boilerplate with webpack5, react, sass, hmr, express & SSR support

## How to use ?

Create a project with https://github.com/n8tz/layer-pack,<br/>
Then add build profiles basing this package available profiles :

- www & wwwDev       : A generic profile to make browser side builds
- api                : A generic profile to make backend/cli builds
- Comp & CompDev     : A generic profile to build stand alone es6/react libs & component
- static & staticDev : A generic profile to build stand alone app with html

<h2>Included ( among others ) : </h2>
<ul>
    <li>react ^17</li>
    <li>express with minimal SSR</li>
    <li>sass</li>
    <li>es6 + decorators</li>
    <li>hot reload with dev server, SSR & api proxying</li>
    <li>react-helmet ( html header manager )</li>
</ul>

## Setup 

In order to install dependencies of this package use:
```
lpack-setup
# or lpack-setup :wantedProfile
```

## Simple .layers.json example :

```
{
    "default":{
        "extend":["lpack-react"]
    },
    "www":"default", // use extends of the default profile, and www profile in lpack-react
    "wwwDev":"default",
    "api":"default"
}
```

* See this package .layers.json for all available profiles

## Available config options :

- targetDir {String}            : relative target build directory
- production {bool}             : build using production mode
- extractCss {bool}             : do extract css
- babelInclude {regexp string}  : optional regexp to force parsing external scripts
- babelPreset {object}          : optional options for the babelPreset loader
- TerserJSPlugin {object}       : optional options for the TerserJSPlugin
- HtmlWebpackPlugin {object}    : optional options for HtmlWebpackPlugin

[![*](https://www.google-analytics.com/collect?v=1&tid=UA-82058889-1&cid=555&t=event&ec=project&ea=view&dp=%2Fproject%2Flpack-react&dt=readme)](#)
