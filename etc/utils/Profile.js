/*
 * Copyright (c) 2020-2022. MIT License.
 */

/**
 * @file Profile.js
 *
 * Profile command execution and lifecycle manager for lpack-react.
 *
 * Reads the `commands` key from a .layers.json profile and orchestrates
 * child processes with support for:
 *   - Sequential execution via `wait` (one command waits for another)
 *   - Directory clearing before build (`clearBefore`)
 *   - File watching for auto-restart (`watch` via chokidar)
 *   - Auto-restart on failure (`forever`)
 *   - Port/process cleanup (`killAfter` via fkill)
 *   - Vars override per command
 */

const lpack      = require('layer-pack'),
      fs         = require('fs'),
      waitOn     = require('wait-on'),
      { rimraf } = require('rimraf'),
      chokidar   = require('chokidar'),
      path       = require('path'),
      exec       = require('child_process').exec;

let fkill;
import('fkill').then(mod => fkill = mod.default).catch(() => {
	console.warn('fkill not available — port cleanup disabled');
});

/**
 * Walk the allCfg array and return the first value found for a given key.
 * Profiles are ordered head-first, so head project's value wins.
 */
function getConfigKey( config, key ) {
	for ( let i = 0; i < config.allCfg.length; i++ )
		if ( config.allCfg[i][key] )
			return config.allCfg[i][key];
}

/**
 * Create a Profile instance that manages the commands defined in a
 * .layers.json profile.
 *
 * @param {string} profileId - Profile key from .layers.json (e.g. "dev", "prod")
 * @returns {{ start, stop, kill, run, getStatus, onComplete }}
 */
module.exports = function Profile( profileId ) {
	let config        = lpack.getConfig(profileId),
	    commands      = getConfigKey(config, "commands"),
	    logs          = {},
	    watchers      = {},
	    running       = {},
	    runAfter      = {},
	    onComplete    = [],
	    curSessionNum = 0,
	    nbCmd         = 0;

	return {
		profileId,
		raw: config,

		/**
		 * Start all commands defined in the profile.
		 * @param {boolean} [resume] - If true, skip commands with skipOnResume flag
		 */
		start( resume ) {
			if ( !commands )
				return console.error('No commands in this profile', profileId);

			curSessionNum++;
			for ( let cmdId in commands )
				if ( commands.hasOwnProperty(cmdId) ) {
					logs[cmdId] = logs[cmdId] || { stdout: [], stderr: [] };
					this.run({ cmdId, resume });
				}
		},

		/** Get status of all commands (running state + last 10 log lines). */
		getStatus() {
			let status = { profileId };
			for ( let cmdId in commands )
				if ( commands.hasOwnProperty(cmdId) ) {
					status[cmdId] = {
						running : !!running[cmdId],
						lastLogs: logs[cmdId] && logs[cmdId].stdout.slice(-10)
					};
				}
			return status;
		},

		/** Register a callback to fire when all commands have completed. */
		onComplete( cb ) {
			onComplete.push(cb);
		},

		cmdLog( cmdId, text ) {
			logs[cmdId].stdout.push(text);
			process.stdout.write(text + "\n");
		},

		cmdErr( cmdId, text ) {
			text = "\x1b[31m" + text + "\x1b[0m\n";
			logs[cmdId].stdout.push(text);
			logs[cmdId].stderr.push(text);
			process.stdout.write(text);
		},

		/**
		 * Stop all running commands and clean up watchers.
		 * @returns {Promise}
		 */
		stop() {
			curSessionNum++;
			runAfter          = {};
			onComplete.length = 0;

			let killTasks = commands
			                ? Object.keys(commands).map(id => this.kill(id, true))
			                : [];

			return Promise.allSettled(killTasks).then(() => {});
		},

		/**
		 * Kill a specific command's process.
		 * @param {string} cmdId
		 * @param {boolean} [stopWatching] - Also close the file watcher
		 * @returns {Promise}
		 */
		kill( cmdId, stopWatching ) {
			let cmd  = running[cmdId],
			    task = commands[cmdId];

			if ( cmd && !cmd.killed ) {
				this.cmdLog(cmdId, 'Killing :' + profileId + '::' + cmdId);
				if ( stopWatching && watchers[cmdId] ) watchers[cmdId].close();
				cmd.killed = true;
			}

			if ( !cmd || !fkill ) return Promise.resolve();

			return fkill(
				[cmd.process.pid, ...(task.killAfter || [])],
				{ tree: true, force: true, silent: true }
			).then(
				() => { running[cmdId] = null; },
				() => { running[cmdId] = null; }
			);
		},

		/**
		 * Run a single command from the profile. Handles the full lifecycle:
		 * wait → clearBefore → watch → spawn → restart/complete.
		 *
		 * @param {object} opts
		 * @param {string} opts.cmdId         - Command key from the profile
		 * @param {boolean} [opts.resume]     - Skip commands with skipOnResume
		 * @param {boolean} [opts.cleared]    - clearBefore already done
		 * @param {boolean} [opts.watched]    - File watcher already set up
		 * @param {boolean} [opts.waitDone]   - Wait dependency satisfied
		 * @param {number}  [opts.sessionNum] - Session counter (stale call detection)
		 */
		run( { cmdId, resume, cleared, watched, waitDone, sessionNum = curSessionNum } ) {
			let cmd  = running[cmdId],
			    task = commands[cmdId],
			    doResume;

			// Ignore callbacks from previous sessions (after stop/restart)
			if ( sessionNum < curSessionNum ) return;

			// If already running, kill first then re-run
			if ( cmd ) {
				if ( !cmd.killed )
					return this.kill(cmdId).then(() => this.run({
						cmdId, resume, cleared, watched, waitDone, sessionNum
					}));
				return; // killed — don't restart
			}

			// Handle skipOnResume: check if the output already exists
			if ( resume && task.skipOnResume ) {
				console.info("skipOnResume ", cmdId);
				if ( task.skipIfExist ) {
					try {
						fs.statSync(path.join(process.cwd(), task.skipIfExist));
						doResume = true;
						console.info("skip because ", task.skipIfExist, "exist");
					} catch ( e ) {
						console.info("skip aborted because ", task.skipIfExist, " don't exist");
						doResume = false;
					}
				}
				else doResume = true;

				if ( doResume )
					return setTimeout(() => {
						this._triggerDependents(cmdId, resume, sessionNum);
					}, 0);
			}

			// If this command waits for another, register and return
			if ( !waitDone && task.wait ) {
				runAfter[task.wait] = runAfter[task.wait] || [];
				runAfter[task.wait].push(cmdId);
				return;
			}

			// Clear output directory before building
			if ( !cleared && task.clearBefore ) {
				console.warn("Clear before ", task.clearBefore);
				return rimraf(task.clearBefore).then(() => this.run({
					cmdId, resume, cleared: true, watched, waitDone, sessionNum
				}));
			}

			nbCmd++;

			// Set up file watcher for auto-restart
			if ( !watched && task.watch ) {
				if ( watchers[cmdId] ) watchers[cmdId].close();
				watchers[cmdId] = undefined;

				return waitOn(
					{
						resources: [task.watch],
						delay    : 1000,
						interval : 100,
						timeout  : 30000
					},
					( err ) => {
						if ( err ) {
							console.warn(cmdId + ": '" + task.watch + "' still not here...");
							return setTimeout(() => this.run({
								cmdId, resume, cleared: true, watched: false, waitDone: true, sessionNum
							}), 3000);
						}

						if ( watchers[cmdId] ) watchers[cmdId].close();

						watchers[cmdId] = chokidar
							.watch(task.watch, {
								ignored   : /(^|[\/\\])\../,
								usePolling: true,
								interval  : 1000
							})
							.on('all', ( event ) => {
								if ( event === 'add' || event === 'change' ) {
									console.warn(cmdId + ": '" + task.watch + "' updated, restarting...");
									if ( running[cmdId] && running[cmdId].killed ) return;
									this.kill(cmdId).then(() => this.run({
										cmdId, resume, cleared: true, watched: true, waitDone: true, sessionNum
									}));
								}
							});
						console.warn(cmdId + ": '" + task.watch + "' waiting updates...");
					}
				);
			}

			if ( running[cmdId] )
				return console.error(cmdId, 'Skipped overstart :' + profileId + '::' + cmdId);

			// Spawn the command
			this.cmdLog(cmdId, 'Starting :' + profileId + '::' + cmdId);
			cmd         = running[cmdId] = {};
			let env     = { ...process.env };
			delete env.__LPACK_PROFILE__; // don't leak parent profile to child
			if ( task.vars ) env.__LPACK_VARS_OVERRIDE__ = JSON.stringify(task.vars);

			cmd.process = exec(
				task.run,
				{ shell: true, env },
				( err ) => {
					if ( cmd.killed ) {
						console.info(cmdId + ": ended normally");
						return;
					}
					if ( err ) {
						this.cmdErr(cmdId, cmdId + ": ended with error: " + err);
					}
					else {
						this.cmdLog(cmdId, cmdId + ": ended");
					}
					// Auto-restart if forever flag is set
					if ( sessionNum === curSessionNum && task.forever ) {
						console.warn(cmdId + " restart ...");
						this.kill(cmdId).then(() => setTimeout(() => this.run({
							cmdId, resume, cleared: true, watched: true, waitDone: true, sessionNum
						}), 5000));
					}
					else if ( sessionNum === curSessionNum ) {
						this._triggerDependents(cmdId, resume, sessionNum);
					}
					running[cmdId] = null;
				}
			);

			cmd.process.stdout.on('data', txt => this.cmdLog(cmdId, txt.toString()));
			cmd.process.stderr.on('data', txt => this.cmdErr(cmdId, txt.toString()));
		},

		/**
		 * Trigger commands that were waiting on `cmdId` to finish,
		 * and fire onComplete callbacks when all commands are done.
		 * @private
		 */
		_triggerDependents( cmdId, resume, sessionNum ) {
			if ( runAfter[cmdId] ) {
				while ( runAfter[cmdId].length )
					this.run({
						cmdId   : runAfter[cmdId].shift(),
						resume,
						cleared : false,
						watched : false,
						waitDone: true,
						sessionNum
					});
			}
			nbCmd--;
			if ( nbCmd === 0 )
				while ( onComplete.length )
					onComplete.shift()();
		}
	};
};
