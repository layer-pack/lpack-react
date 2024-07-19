/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */
import Index              from "App/index.html";
import React              from "react";
import ReactDom           from 'react-dom';
import { renderToString } from "react-dom/server";
import { Helmet }         from "react-helmet";


const ctrl = {
    renderTo( node, initialState = {} ) {
        const isDev  = process.env.NODE_ENV !== 'production',
              App    = require('App/App.js').default;
        
        ReactDom.render(
            <App/>
            , node);
        
    },
    renderSSR( { state, tpl }, cb ) {
        let content = "",
            App     = require('App/App.js').default,
            html;
        
        try {
            content = renderToString(
                <App/>
            );
            html    = "<!doctype html>\n" +
                      renderToString(<Index
                          helmet={ Helmet.renderStatic() }
                          content={ content }
                          state={ {} }
                      />);
        } catch ( e ) {
            return cb(e)
        }
        cb(null, html)
    }
}

export default ctrl;

