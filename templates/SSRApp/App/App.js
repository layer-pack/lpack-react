/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import React                          from 'react';
import { Pages, Comps, Hooks, Views } from "App/ui";

import "./App.scss"

class App extends React.Component {
    
    render() {
        return <React.Fragment>
            <Pages.Home/>
        </React.Fragment>
    }
}

export default App