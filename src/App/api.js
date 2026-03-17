/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

/**
 * @file api.js
 *
 * Auto-discovers and registers API services via glob import.
 *
 * Each file in `./api/` can export either:
 *   - A function: treated as a service with priorityLevel 0
 *   - An object: { name, priorityLevel, service(server, http) }
 *
 * Services are sorted by priorityLevel (highest first) and registered
 * on the Express server in that order.
 */

import is  from 'is';
import api from './api/(*).js';

let debug = require('./console').default("server");

export default ( server, http ) => Object
	.keys(api)
	.map(
		( service ) => (
			is.fn(api[service])
			? { name: service, priorityLevel: 0, service: api[service] }
			: api[service]
		)
	)
	.sort(( a, b ) => (a.priorityLevel > b.priorityLevel ? -1 : 1))
	.forEach(
		( service ) => {
			try {
				debug.info("Load Api : ", service.name, "\n");
				service.service(server, http);
			} catch ( e ) {
				debug.error("Api fail loading service ", service.name, "\n", e);
			}
		});
