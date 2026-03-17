/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

/**
 * @file index.client.js
 *
 * Browser entry point. Mounts the React app into the #app container,
 * rehydrating from the SSR state serialised in window.__STATE__.
 */
import App from "./index";

App.renderTo(document.getElementById('app'), window.__STATE__);
