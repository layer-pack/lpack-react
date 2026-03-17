/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

/**
 * @file api/index.js
 *
 * Default rendering service — serves the SSR-rendered React app on GET /
 * and static assets from dist/www. Loaded via the glob import in api.js.
 */

import express from "express";
import config  from "../config";
import App     from "../index.js";

export const name          = "Rendering service";
export const priorityLevel = 100000;
export const service       = ( server ) => {
	server.get(
		'/',
		function ( req, res, next ) {
			App.renderSSR(
				{ url: req.url },
				( err, html ) => {
					if ( err ) {
						res.status(500).send('<pre>' + err + '</pre>');
						return;
					}
					res.status(200).send(html);
				}
			);
		}
	);
	server.use(express.static(config.projectRoot + '/dist/www'));
};
