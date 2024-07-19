/*
 * Copyright (c) 2020-2022.
 *  MIT
 */

const lpack      = require('layer-pack'),
      fs         = require('fs'),
      waitOn     = require('wait-on'),
      { rimraf } = require('rimraf'),
      chokidar   = require('chokidar'),
      path       = require('path'),
      exec       = require('child_process').exec,
      spawn      = require('child_process').spawn;

let fkill;
import('fkill').then(
	mod => fkill = mod.default
);

function getConfigKey( config, key ) {
	for ( let i = 0; i < config.allCfg.length; i++ )
		if ( config.allCfg[i][key] )
			return config.allCfg[i][key];
}


/**
 * This is the draft build profiles managers
 * @param profileId
 * @param project
 */
module.exports = function Profile( profileId, project ) {
	let config        = lpack.getConfig(profileId),
	    commands      = getConfigKey(config, "commands"),
	    logs          = {},
	    watchers      = {},
	    running       = {},
	    killing       = {},
	    runAfter      = {},
	    onComplete    = [],
	    curSessionNum = 0,
	    nbCmd         = 0;
	
	return {
		profileId,
		raw: config,
		start( resume ) {
			if ( !commands )
				return console.error('No commands in this profile', profileId);
			
			curSessionNum++;
			for ( let cmdId in commands )
				if ( commands.hasOwnProperty(cmdId) ) {
					logs[cmdId] = logs[cmdId] || { stdout: [], stderr: [] };
					this.run({ cmdId, resume })
				}
		},
		getStatus() {
			let status = { profileId };
			
			for ( let cmdId in commands )
				if ( commands.hasOwnProperty(cmdId) ) {
					status[cmdId] = {
						running : !!running[cmdId],
						lastLogs: logs[cmdId] && logs[cmdId].stdout.slice(-10)
					}
				}
			return status;
		},
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
		stop() {
			curSessionNum++;
			runAfter          = {};
			onComplete.length = 0;
			return Promise.allSettled(
				[
					...(commands && Object.keys(commands).map(id => this.kill(id, true)) || []),
					//killPortProcess(1234),
					fkill(":8080", { tree: true, force: true, silent: true })
				]
			).then(e => (killing = {}));
		},
		kill( cmdId, stopWatching ) {
			let cmd  = running[cmdId],
			    task = commands[cmdId];
			//console.warn("Killing " + ':' + profileId + '::' + cmdId, cmd.process.pid, task.killAfter);
			
			if ( cmd && !cmd.killed ) {
				this.cmdLog(cmdId, 'Killing ' + ':' + profileId + '::' + cmdId);
				stopWatching && watchers[cmdId] && watchers[cmdId].close();
				cmd.killed = true;
			}
			//if ( cmd )
			
			//cmd && cmd.process.kill('SIGINT');
			//cmd && cmd.process.stdin.write("\x03");
			
			return cmd && fkill([cmd.process.pid, ...(task.killAfter || [])], {
				tree  : true,
				force : true,
				silent: true
				//forceAfterTimeout: 1000
			})
				.then(
					logs => {
						running[cmdId] = null;
					},
					err => {
						running[cmdId] = null;
					}
				) || new Promise(resolve => resolve())
		},
		run( { cmdId, resume, cleared, watched, waitDone, sessionNum = curSessionNum } ) {
			let cmd  = running[cmdId],
			    task = commands[cmdId], doResume, lastBuildTm;
			
			if ( sessionNum < curSessionNum )// stop previous lost call backs
				return;
			
			if ( cmd || cmd && cmd.killed ) {
				if ( cmd && !cmd.killed )
					return this.kill(cmdId).then(e => this.run({
						                                           cmdId,
						                                           resume,
						                                           cleared,
						                                           watched,
						                                           waitDone,
						                                           sessionNum
					                                           }));
				else return;
			}
			
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
					return setTimeout(
						tm => {
							if ( runAfter[cmdId] ) {
								while ( runAfter[cmdId].length )
									this.run({
										         cmdId   : runAfter[cmdId].shift(), resume,
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
					)
			}
			if ( !waitDone && task.wait ) {
				runAfter[task.wait] = runAfter[task.wait] || [];
				runAfter[task.wait].push(cmdId);
				return;
			}
			if ( !cleared && task.clearBefore ) {
				console.warn("Clear before ", task.clearBefore);
				return rimraf(task.clearBefore).then(( err, val ) => this.run({
					                                                              cmdId, resume,
					                                                              cleared: true,
					                                                              watched,
					                                                              waitDone,
					                                                              sessionNum
				                                                              }));
			}
			
			nbCmd++;
			if ( !watched && task.watch ) {
				watchers[cmdId] && watchers[cmdId].close();
				watchers[cmdId] = undefined;
				return waitOn({
					              resources: [
						              task.watch
					              ],
					              delay    : 1000,
					              interval : 100,
					              timeout  : 30000,
				              },
				              err => {
					              if ( err ) {
						              console.warn(cmdId + ": '" + task.watch + "' still not here...");
						              return setTimeout(tm => this.run({
							                                               cmdId, resume,
							                                               cleared : true,
							                                               watched : false,
							                                               waitDone: true,
							                                               sessionNum
						                                               }), 3000);
					              }
					              
					              watchers[cmdId] && watchers[cmdId].close();
					              
					              watchers[cmdId] = chokidar
						              .watch(task.watch, {
							              ignored           : /(^|[\/\\])\../,
							              usePolling        : true,
							              "aggregateTimeout": 300,
							              "poll"            : 1000
						              })
						              .on('all', ( event, path ) => {
							              
							              if ( event === 'add' || event === 'change' ) {
								              console.warn(cmdId + ": '" + task.watch + "' has been updated restarting...");
								              
								              if ( running[cmdId] && running[cmdId].killed ) {
									              console.info(cmdId + ": '" + task.watch + "' ignore on local kill...")
									              return;
								              }
								              this.kill(cmdId).then(
									              e => this.run({
										                            cmdId,
										                            resume,
										                            cleared : true,
										                            watched : true,
										                            waitDone: true,
										                            sessionNum
									                            })
								              );
							              }
						              });
					              console.warn(cmdId + ": '" + task.watch + "' waiting updates...");
				              }
				)
			}
			
			
			if ( running[cmdId] )
				return console.error(cmdId, 'Skipped overstart ' + ':' + profileId + '::' + cmdId);
			
			this.cmdLog(cmdId, 'Starting ' + ':' + profileId + '::' + cmdId);
			cmd         = running[cmdId] = {};
			cmd.process = exec(
				task.run,
				{
					shell: true,
					//stdio: 'inherit',
					env: {
						...process.env,
						'__LPACK_PROFILE__': undefined,
						...(task.vars && { '__LPACK_VARS_OVERRIDE__': JSON.stringify(task.vars) })
					}
				},
				( err ) => {
					//err && console.warn(err);
					if ( cmd.killed ) {
						console.info(cmdId + ": '" + task.run + "' ended normally...")
						return;
					}
					if ( err ) {
						this.cmdErr(cmdId, cmdId + ": '" + task.run + "' ended with error : " + err);
					}
					else
						this.cmdLog(cmdId, cmdId + ": '" + task.run + "' ended ...");
					if ( sessionNum === curSessionNum && task.forever ) {
						console.warn(cmdId + " restart ...");
						this.kill(cmdId).then(
							e => setTimeout(tm => this.run({
								                               cmdId, resume,
								                               cleared   : true,
								                               watched   : true,
								                               waitDone  : true,
								                               sessionNum: sessionNum
							                               }), 5000)
						);
					}
					else {// normal exit
						if ( sessionNum === curSessionNum ) {
							//watchers[cmdId] && watchers[cmdId].close();
							
							if ( runAfter[cmdId] ) {
								while ( runAfter[cmdId].length )
									this.run({
										         cmdId   : runAfter[cmdId].shift(), resume,
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
					}
					running[cmdId] = null;
				}
			);
			
			cmd.process.stdout.on('data', txt => (this.cmdLog(cmdId, txt.toString())))
			cmd.process.stderr.on('data', txt => (this.cmdErr(cmdId, txt.toString())))
		}
	}
}
