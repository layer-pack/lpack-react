/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

/**
 * @file index.js
 *
 * Main application controller for the SSR app. Exports two methods:
 *
 *   - `renderTo(node, initialState)` — client-side: mounts the React app
 *     into the given DOM node using createRoot (React 18+/19 compatible).
 *
 *   - `renderSSR({ state, tpl }, cb)` — server-side: renders the app to
 *     an HTML string using renderToString for SSR, including Helmet meta
 *     tags and error handling.
 *
 * The `require('App/App.js')` calls are intentionally dynamic — this
 * allows webpack HMR to pick up the latest module version on each render.
 */
import "core-js";
import React            from "react";
import {createRoot}     from 'react-dom/client';
import {renderToString} from "react-dom/server";
import {Helmet}         from "react-helmet";
import "regenerator-runtime/runtime";
import Index            from "./index.html";


const ctrl = {
	/**
	 * Mount the React app into a DOM node (client-side entry point).
	 * @param {HTMLElement} node         - DOM container (typically #app)
	 * @param {object}      initialState - SSR state from window.__STATE__
	 */
	renderTo( node, initialState = {} ) {
		const App = require('App/App.js').default;
		createRoot(node).render(<App/>);
	},

	/**
	 * Render the app to an HTML string for SSR.
	 * @param {object}   opts      - { state, tpl, url }
	 * @param {Function} cb        - (err, html) callback
	 */
	renderSSR( { state, tpl }, cb ) {
		let content = "",
		    App     = require('App/App.js').default,
		    html;

		try {
			content = renderToString(<App/>);
			html    = "<!doctype html>\n" + renderToString(
				<Index helmet={Helmet.renderStatic()} content={content}/>
			);
		} catch ( e ) {
			html = "<!doctype html>\n" + renderToString(
				<Index ssrErrors={`<pre>${e}\n${e.stack}</pre>`}/>
			);
		}
		cb(null, html);
	}
};

export default ctrl;
