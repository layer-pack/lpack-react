/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */
import React    from "react";
import ReactDom from "react-dom";
import {hot}    from "react-hot-loader/root";


const isDev  = process.env.NODE_ENV !== 'production',
      App    = require('App/App.js').default,
      HMRApp = isDev ? hot(App) : App;

ReactDom.render(
	<HMRApp/>
	, document.getElementById('app'));

if ( process.env.NODE_ENV !== 'production' && module.hot ) {
	module.hot.accept('App/App.js', m => {
		let NextApp = hot(require('App/App.js').default);
		
		ReactDom.render(
			<NextApp/>
			, document.getElementById('app'));
	})
}


