#!/usr/bin/env node
/*
 * Copyright (c) 2019. MIT License.
 * @author Nathanael Braun <n8tz.js@gmail.com>
 */

/**
 * @file start.js
 *
 * Build control server for lpack-react. Manages profile lifecycle and
 * exposes a simple HTTP API for monitoring and control:
 *
 *   GET /status          — current build status (running commands, logs)
 *   GET /restart         — restart the current profile
 *   GET /switch?to=prod  — stop current profile, switch to another
 *   GET /kill            — stop all processes and exit
 *
 * Usage:
 *   lpack-run :dev start          # start dev profile
 *   lpack-run :prod start -p 9090 # start prod with control server on port 9090
 */
'use strict';

const program = require('commander'),
      express = require("express"),
      server  = express(),
      http    = require('http').Server(server),
      argz    = process.argv.slice(2),
      Profile = require('../utils/Profile');

let profileId = process.env.__LPACK_PROFILE__ || "default";

// Parse :profileId from CLI args (e.g. "lpack-run :dev start")
if ( argz[0] && /^\:.*$/.test(argz[0]) )
	profileId = argz.shift().replace(/^\:(.*)$/, '$1');

program
	.option('-l, --local', 'Limit build control API to localhost')
	.option('-p, --port [port]', 'Build control server port (default: 9090)')
	.parse(process.argv);

let port    = program.port === true ? 9090 : program.port,
    profile = new Profile(profileId);

profile.start();
profile.onComplete(() => process.exit());

process.on('SIGINT', () => profile.stop().then(() => process.exit()));
process.on('SIGTERM', () => profile.stop().then(() => process.exit()));

// Start the control server if a port is configured
if ( port ) {
	server.use(express.json());
	server.use(express.urlencoded({ extended: true }));

	server.get("/status", ( req, res ) => {
		res.header("Access-Control-Allow-Origin", "*");
		res.json({ status: profile.getStatus() });
	});

	server.get("/restart", ( req, res ) => {
		res.header("Access-Control-Allow-Origin", "*");
		profile.start();
		res.json({ success: true });
	});

	server.get("/switch", ( req, res ) => {
		res.header("Access-Control-Allow-Origin", "*");
		profileId = req.query.to || "prod";
		profile.stop().then(() => {
			profile = new Profile(profileId);
			profile.start();
			res.json({ success: true, profileId });
		});
	});

	server.get("/kill", ( req, res ) => {
		res.header("Access-Control-Allow-Origin", "*");
		res.json({ success: true });
		profile.stop().then(() => process.exit());
	});

	http.listen(parseInt(port), function () {
		console.info('Build manager running on port', this.address().port);
	});
}
