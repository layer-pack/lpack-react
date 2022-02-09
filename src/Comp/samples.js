/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */
import React    from "react";
import ReactDom from "react-dom";

import Comp  from "./index"
import {hot} from "react-hot-loader/root";

console.log("Dev !")

const isDev   = process.env.NODE_ENV !== 'production',
      HMRComp = isDev ? hot(Comp) : Comp;

ReactDom.render(
	<HMRComp/>
	, document.getElementById('app'));

if ( process.env.NODE_ENV !== 'production' && module.hot ) {
	module.hot.accept('./index',
	                  m => ReactDom.render(
		                  <HMRComp/>
		                  , document.body));
}