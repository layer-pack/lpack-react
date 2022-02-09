/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import React    from 'react';
import {Helmet} from "react-helmet";

class App extends React.Component {
	
	render() {
		return <React.Fragment>
			<Helmet>
				<meta charSet="utf-8"/>
				<title>lpack-react boilerplate v1.0</title>
			</Helmet>
			<h1>lpack-react boilerplate v1.0</h1>
			<h2>Included ( among others ) : </h2>
			<ul>
				<li>react ^17</li>
				<li>sass</li>
				<li>es6 + decorators</li>
				<li>hot reload with dev server</li>
			</ul>
		</React.Fragment>
	}
}

export default App