/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

/**
 * @file index.html.js
 *
 * SSR HTML shell component. Used by renderToString on the server to produce
 * the full HTML document with Helmet meta tags, SSR content, inline state,
 * and script/style references.
 *
 * Props:
 *   - helmet:    Helmet.renderStatic() result (meta, title, links, scripts)
 *   - content:   SSR-rendered React markup string
 *   - css:       Optional inline CSS string
 *   - state:     Serialisable app state (injected as window.__STATE__)
 *   - ssrErrors: Optional error HTML (shown on SSR failure)
 */
import React from 'react';

export default class Index extends React.Component {
	render() {
		const { helmet, content, ssrErrors, css, state } = this.props,
		      htmlAttrs = helmet && helmet.htmlAttributes.toComponent(),
		      bodyAttrs = helmet && helmet.bodyAttributes.toComponent();
		return <React.Fragment>
			<html {...htmlAttrs}>
			<head>
				{helmet && helmet.title.toComponent()}
				{helmet && helmet.meta.toComponent()}
				{helmet && helmet.link.toComponent()}
				{helmet && helmet.script.toComponent()}
				{state && <script dangerouslySetInnerHTML={{ __html: "window.__STATE__  = " + JSON.stringify(state) }}/>}
				{css && <style type="text/css" dangerouslySetInnerHTML={{ __html: css + '' }}/>}
			</head>
			<body {...bodyAttrs}>
			<div id="app" dangerouslySetInnerHTML={{ __html: content }}/>
			{ssrErrors && <div id="ssrErrors" dangerouslySetInnerHTML={{ __html: ssrErrors }}/>}
			<script src="./App.js"></script>
			<script src="./App.vendors.js"></script>
			</body>
			</html>
		</React.Fragment>;
	}
}
