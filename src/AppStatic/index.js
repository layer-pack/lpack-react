/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */
import React    from "react";
import ReactDom from "react-dom";


const App    = require('App/App.js').default;

ReactDom.render(
	<App/>
	, document.getElementById('app'));



