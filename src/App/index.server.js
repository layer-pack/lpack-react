/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

/**
 * @file index.server.js
 *
 * Server-side entry point. Starts an Express HTTP server and registers
 * all API services discovered via the glob import in api.js.
 *
 * Usage: node App.server.js [-p port]
 * Default port: 8000
 */
import React  from "react";
import api    from "./api";
import config from "./config";

const express = require("express"),
      server  = express(),
      http    = require('http').Server(server),
      argz    = require('minimist')(process.argv.slice(2)),
      debug   = require('./console').default("server");

process.title = config.project.name + '::server';
debug.warn("process.env.DEBUG : ", process.env.DEBUG);

server.use(express.json({ limit: '10mb' }));
server.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Register all API services (auto-discovered via glob in api.js)
api(server, http);

const port = parseInt(argz.p || argz.port || 8000);
http.listen(port, function () {
	debug.info('Running on port', port);
});
