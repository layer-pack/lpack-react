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
				<title>lpack-react boilerplate v1.1</title>
			</Helmet>
			<h1>lpack-react boilerplate v1.1</h1>
			<h2>Included ( among others ) : </h2>
			<ul>
				<li>react ^18</li>
				<li>express with minimal SSR</li>
				<li>sass</li>
				<li>es6 + decorators</li>
				<li>react-refresh, SSR & api proxying</li>
				<li>react-helmet ( html header manager )</li>
			</ul>
		</React.Fragment>
	}
}

export default App
