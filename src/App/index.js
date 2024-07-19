/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */
import "core-js";
import React            from "react";
import ReactDom         from 'react-dom';
import {renderToString} from "react-dom/server";
import {Helmet}         from "react-helmet";
import "regenerator-runtime/runtime";
import Index            from "./index.html";


const ctrl = {
	renderTo( node, initialState = {} ) {
		const App    = require('App/App.js').default;
		
		ReactDom.render(
			<App/>
			, node);
	},
	renderSSR( { state, tpl }, cb ) {
		let content = "",
		    App     = require('App/App.js').default,
		    html;
		
		try {
			content = renderToString(<App/>);
			html    = "<!doctype html>\n" + renderToString(<Index helmet={Helmet.renderStatic()} content={content}/>);
		} catch ( e ) {
			html = "<!doctype html>\n" + renderToString(<Index ssrErrors={`<pre>${e}\n${e.stack}</pre>`}/>);
		}
		cb(null, html)
	}
}

export default ctrl;

