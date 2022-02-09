/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */


import App     from "App/index.js";
import express from "express";


let currentState;

/**
 * Add the rendering services to the main express instance
 * @param server {express}
 */

export const name          = "Rendering";
export const priorityLevel = 100000;
export const service       = ( server ) => {
	
	const servePage = ( req, res, next ) => {
		App.renderSSR(
			{
				location: req.url,
				state   : currentState,
			},
			( err, html, nstate ) => {
				res.send(200, err && ("" + err + "\n" + err.stack) || html)
			}
		)
	};
	server.get(
		'/', servePage);
	server.use(express.static('dist/www'));
};
