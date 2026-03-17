/*
 * Copyright 2021 BRAUN Nathanael
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

/**
 * @file console.js (AppStatic variant)
 *
 * Namespace-aware logging utility. See App/console.js for full docs.
 * Duplicated because AppStatic uses a separate rootFolder.
 */
import config   from "App/config";
import debounce from "debounce";
import debug    from "debug-logger";
import is       from "is";

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

if ( isBrowserSide && !window.consoleHookDone ) {
	window.consoleHookDone = true;

	function truncate( string, ln ) {
		return string.length > ln ? string.substring(0, ln) + '...' : string;
	}

	let hookedWarn   = console.warn,
	    hookedError  = console.error,
	    recentWarn   = [],
	    recentErrors = [],
	    warn         = debounce(function () {
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
	    }, 2000),
	    error        = debounce(function () {
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
	    }, 2000);

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
