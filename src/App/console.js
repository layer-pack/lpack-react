/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

/**
 * @file console.js
 *
 * Provides a namespace-aware logging utility that wraps `debug-logger` on
 * the server and the browser console on the client.
 *
 * On the browser side, vendor warnings and errors (from React, etc.) are
 * automatically grouped and debounced to keep the console clean during
 * development — only the project's own messages are shown immediately.
 */
import config   from "App/config";
import debounce from "debounce";
import debug    from "debug-logger";
import is       from "is";

/**
 * Create a namespace-aware console.
 *
 * Server: delegates to debug-logger (supports DEBUG env var filtering).
 * Browser: wraps the native console, preserving all standard methods.
 *
 * Calling the returned function with a sub-namespace creates a child logger:
 *   const log = new _console("app");
 *   const dbLog = log("db"); // creates "app::db" namespace
 */
const isBrowserSide = !__IS_SERVER__,
      _console      = __IS_SERVER__
                      ? function _console( ns, nmFn = () => '' ) {
	      var c  = debug(ns),
	          fn = ( ns2 ) => (new _console(ns + "::" + ns2));

	      for ( var k in c )
		      if ( c.hasOwnProperty(k) && !this[k] && is.fn(c[k]) )
			      fn[k] = c[k].bind(c, nmFn(ns));

	      fn.beep = function () {
		      process.stdout.write('\x07');
		      this.error(...arguments);
	      };

	      return fn;
      }
                      : function _console( ns, nmFn = () => '' ) {
	      var c  = console,
	          fn = ( ns2 ) => (new _console(ns + "::" + ns2));

	      for ( var k in c )
		      if ( c.hasOwnProperty(k) && !this[k] && is.fn(c[k]) )
			      fn[k] = c[k].bind(console, nmFn(ns));

	      fn.beep = function () {
		      this.error(...arguments);
	      };

	      return fn;
      };

debug.inspectOptions = { colors: true };
debug.debug.enable(config.project.name + '*');

/**
 * On the browser side, group vendor warnings/errors with a debounced
 * collapsed group so they don't flood the console during development.
 * Project-own messages (matching the project name prefix) pass through
 * immediately.
 */
if ( isBrowserSide && !window.consoleHookDone ) {
	window.consoleHookDone = true;

	function truncate( string, ln ) {
		return string.length > ln ? string.substring(0, ln) + '...' : string;
	}

	let hookedWarn   = console.warn,
	    hookedError  = console.error,
	    recentWarn   = [],
	    recentErrors = [],
	    warn         = debounce(
		    function () {
			    console.groupCollapsed(" %d %cvendors warns%c (%s)", recentWarn.length,
			                           "color: orange; text-decoration: underline",
			                           "color: gray; font-style: italic;font-size:.7em",
			                           truncate(recentWarn.map(v => v.join(', ')).join('\t'), 50));
			    recentWarn.forEach(( [argz, trace] ) => {
				    console.groupCollapsed(...argz);
				    hookedWarn.call(console, trace);
				    console.groupEnd();
			    });
			    recentWarn = [];
			    console.groupEnd();
		    },
		    2000
	    ),
	    error        = debounce(
		    function () {
			    console.groupCollapsed(" %d %cvendors errors%c (%s)", recentErrors.length,
			                           "color: red; text-decoration: underline",
			                           "color: gray; font-style: italic;font-size:.7em",
			                           truncate(recentErrors.map(v => v.join(', ')).join('\t'), 50));
			    recentErrors.forEach(( [argz, trace] ) => {
				    console.groupCollapsed(...argz);
				    hookedError.call(console, trace);
				    console.groupEnd();
			    });
			    recentErrors = [];
			    console.groupEnd();
		    },
		    2000
	    );

	// Let project-own messages through immediately; batch vendor messages.
	console.warn = function ( ...argz ) {
		if ( is.string(argz[0]) && argz[0].startsWith(config.project.name) )
			return hookedWarn(...argz);
		recentWarn.push([argz, (new Error()).stack]);
		warn();
	};
	console.error = function ( ...argz ) {
		if ( is.string(argz[0]) && argz[0].startsWith(config.project.name) )
			return hookedError(...argz);
		recentErrors.push([argz, (new Error()).stack]);
		error();
	};
}

const d_console = new _console(config.project.name);

export { d_console as console };
export default d_console;
