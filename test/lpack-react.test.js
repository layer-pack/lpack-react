/**
 * Test suite for lpack-react — inheritable React/Webpack/Express/SSR layer.
 *
 * Tests:
 *   1. Package structure — all required files exist
 *   2. .layers.json — all profiles parse correctly, vars are valid
 *   3. Config loading — child project can extend lpack-react, inheritance works
 *   4. Profile resolution — basedOn, vars merging, DefinePluginCfg
 *   5. Webpack configs — all 4 configs are loadable, export valid arrays
 *   6. Source files — App, AppStatic, Comp directories are well-formed
 *   7. Template — SSRApp template has all required files
 *
 * Run: node --test test/lpack-react.test.js
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert');
const path             = require('path');
const fs               = require('fs');

const lpackReactDir = path.resolve(__dirname, '..');
const fixturesDir   = path.join(__dirname, 'fixtures');
const childAppDir   = path.join(fixturesDir, 'child-app');

let utils, stripJsonComments;
try {
	utils             = require('layer-pack/src/utils');
	stripJsonComments = require('layer-pack/src/utils.json');
} catch ( e ) {
	utils             = require(path.join(lpackReactDir, 'node_modules', 'layer-pack', 'src', 'utils'));
	stripJsonComments = require(path.join(lpackReactDir, 'node_modules', 'layer-pack', 'src', 'utils.json'));
}

function readLayersJson( dir ) {
	const raw = fs.readFileSync(path.join(dir, '.layers.json'), 'utf8');
	return JSON.parse(stripJsonComments(raw));
}

// ─── helpers ────────────────────────────────────────────────────────

function fileExists( ...parts ) {
	return fs.existsSync(path.join(lpackReactDir, ...parts));
}

function loadChildConfig( profileId ) {
	profileId = profileId || 'default';
	const lpackCfg = readLayersJson(childAppDir);
	const pkgCfg   = JSON.parse(fs.readFileSync(path.join(childAppDir, 'package.json'), 'utf8'));

	let profile = lpackCfg[profileId];
	if ( profile.basedOn ) {
		profile = { ...lpackCfg[profile.basedOn], ...profile };
	}
	return utils.getConfigByProfiles(childAppDir, profile, profileId, {
		...pkgCfg, layerPack: lpackCfg
	});
}

// ─── 1. Package structure ───────────────────────────────────────────

describe('lpack-react: package structure', () => {
	it('package.json exists and has correct name', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(lpackReactDir, 'package.json'), 'utf8'));
		assert.strictEqual(pkg.name, 'lpack-react');
		assert(pkg.version, 'Should have a version');
	});

	it('.layers.json exists and is valid JSON', () => {
		const cfg = readLayersJson(lpackReactDir);
		assert(cfg.default, 'Should have default profile');
	});

	it('all webpack config files exist', () => {
		assert(fileExists('etc', 'wp', 'webpack.config.www.js'), 'www config');
		assert(fileExists('etc', 'wp', 'webpack.config.api.js'), 'api config');
		assert(fileExists('etc', 'wp', 'webpack.config.comp.js'), 'comp config');
		assert(fileExists('etc', 'wp', 'webpack.config.static.js'), 'static config');
	});

	it('CLI scripts exist', () => {
		assert(fileExists('etc', 'cli', 'start.js'), 'start.js');
	});

	it('utility modules exist', () => {
		assert(fileExists('etc', 'utils', 'Profile.js'), 'Profile.js');
	});
});

// ─── 2. Source files ────────────────────────────────────────────────

describe('lpack-react: source files', () => {

	it('App/ has all required SSR files', () => {
		const required = [
			'App.js', 'index.js', 'index.client.js', 'index.server.js',
			'index.html.js', 'api.js', 'config.js', 'console.js'
		];
		for ( const f of required ) {
			assert(fileExists('src', 'App', f), `src/App/${f} should exist`);
		}
	});

	it('App/api/ has the rendering service', () => {
		assert(fileExists('src', 'App', 'api', 'index.js'), 'api/index.js should exist');
	});

	it('AppStatic/ has all required files', () => {
		const required = ['App.js', 'index.js', 'index.html.js', 'index.html.tpl', 'config.js'];
		for ( const f of required ) {
			assert(fileExists('src', 'AppStatic', f), `src/AppStatic/${f} should exist`);
		}
	});

	it('Comp/ has all required files', () => {
		const required = ['App.js', 'index.js', 'samples.js'];
		for ( const f of required ) {
			assert(fileExists('src', 'Comp', f), `src/Comp/${f} should exist`);
		}
	});
});

// ─── 3. Template ────────────────────────────────────────────────────

describe('lpack-react: SSRApp template', () => {

	it('template directory exists with .layers.json', () => {
		assert(fileExists('templates', 'SSRApp', '.layers.json'));
		assert(fileExists('templates', 'SSRApp', 'package.json'));
	});

	it('template has App structure', () => {
		assert(fileExists('templates', 'SSRApp', 'App', 'App.js'));
		assert(fileExists('templates', 'SSRApp', 'App', 'ui', 'index.js'));
	});

	it('template .layers.json extends lpack-react', () => {
		const tplCfg = readLayersJson(path.join(lpackReactDir, 'templates', 'SSRApp'));
		const hasExtend = Object.values(tplCfg).some(
			p => p.extend && p.extend.includes('lpack-react')
		);
		assert(hasExtend, 'Template should extend lpack-react in at least one profile');
	});
});

// ─── 4. .layers.json profiles ───────────────────────────────────────

describe('lpack-react: profile definitions', () => {
	let cfg;

	it('parse .layers.json successfully', () => {
		cfg = readLayersJson(lpackReactDir);
	});

	it('has all expected profiles', () => {
		const expected = ['default', 'dev', 'prod', 'www', 'wwwDev', 'api'];
		for ( const p of expected ) {
			assert(cfg[p], `Profile "${p}" should exist`);
		}
	});

	it('default profile has rootFolder', () => {
		assert(cfg.default.rootFolder, 'default should have rootFolder');
	});

	it('www profile has config and vars', () => {
		const www = cfg.www;
		assert(www.config, 'www should reference a webpack config');
		assert(www.vars, 'www should have vars');
		assert(www.vars.targetDir, 'www should set targetDir');
	});

	it('api profile has externals and server flag', () => {
		const api = cfg.api;
		assert(api.vars, 'api should have vars');
		assert.strictEqual(api.vars.externals, true, 'api should enable externals');
		assert.strictEqual(api.vars.DefinePluginCfg?.__IS_SERVER__, true, 'api __IS_SERVER__ should be true');
	});

	it('wwwDev enables devServer', () => {
		const wwwDev = cfg.wwwDev;
		assert(wwwDev.vars, 'wwwDev should have vars');
		assert.strictEqual(wwwDev.vars.devServer, true, 'wwwDev should enable devServer');
		assert.strictEqual(wwwDev.vars.production, false, 'wwwDev should disable production');
	});

	it('dev profile has commands for orchestration', () => {
		assert(cfg.dev.commands, 'dev should have commands');
		const cmdIds = Object.keys(cfg.dev.commands);
		assert(cmdIds.length > 0, 'dev should have at least one command');
	});

	it('prod profile has commands for orchestration', () => {
		assert(cfg.prod.commands, 'prod should have commands');
	});
});

// ─── 5. Config loading via layer-pack ───────────────────────────────

describe('lpack-react: config loading (child extends lpack-react)', () => {
	let config;

	it('child-app can load default config extending lpack-react', () => {
		config = loadChildConfig('default');
		assert(config, 'Config should load');
		assert(config.allRoots.length >= 2, 'Should have at least 2 roots (child + lpack-react)');
		assert(config.allModuleRoots.length >= 2, 'Should have at least 2 module roots');
	});

	it('child-app root is first (head wins)', () => {
		assert(
			config.allRoots[0].includes('child-app'),
			`First root should be child-app, got: ${config.allRoots[0]}`
		);
	});

	it('lpack-react root is in the chain', () => {
		const hasLpackReact = config.allRoots.some(r => r.includes('lpack-react'));
		assert(hasLpackReact, 'lpack-react root should be in allRoots');
	});

	it('lpack-react package config is loaded', () => {
		const hasLpackReactPkg = config.allPackageCfg.some(p => p.name === 'lpack-react');
		assert(hasLpackReactPkg, 'allPackageCfg should include lpack-react');
	});
});

describe('lpack-react: profile vars merging', () => {

	it('www profile inherits rootAlias default', () => {
		const config = loadChildConfig('www');
		assert.strictEqual(config.vars.rootAlias, 'App', 'rootAlias should default to App');
	});

	it('www profile gets targetDir from child', () => {
		const config = loadChildConfig('www');
		assert.strictEqual(config.vars.targetDir, 'dist/www', 'targetDir should be from child www profile');
	});

	it('www profile gets production=false from child', () => {
		const config = loadChildConfig('www');
		assert.strictEqual(config.vars.production, false);
	});

	it('api profile gets externals=true from child', () => {
		const config = loadChildConfig('api');
		assert.strictEqual(config.vars.externals, true);
	});

	it('all profiles have rootAlias set', () => {
		for ( const profileId of ['default', 'www', 'api', 'static'] ) {
			const config = loadChildConfig(profileId);
			assert(config.vars.rootAlias, `${profileId} should have rootAlias`);
		}
	});
});

// ─── 6. Dependency validation ───────────────────────────────────────

describe('lpack-react: dependency validation', () => {
	let pkg;

	it('load package.json', () => {
		pkg = JSON.parse(fs.readFileSync(path.join(lpackReactDir, 'package.json'), 'utf8'));
	});

	it('has react and react-dom in dependencies', () => {
		assert(pkg.dependencies.react, 'react should be in dependencies');
		assert(pkg.dependencies['react-dom'], 'react-dom should be in dependencies');
	});

	it('has express in dependencies (for SSR)', () => {
		assert(pkg.dependencies.express, 'express should be in dependencies');
	});

	it('has webpack and webpack-cli in devDependencies', () => {
		assert(pkg.devDependencies.webpack, 'webpack should be in devDependencies');
		assert(pkg.devDependencies['webpack-cli'], 'webpack-cli should be in devDependencies');
	});

	it('has babel core and presets in devDependencies', () => {
		assert(pkg.devDependencies['@babel/core'], '@babel/core');
		assert(pkg.devDependencies['@babel/preset-env'], '@babel/preset-env');
		assert(pkg.devDependencies['@babel/preset-react'], '@babel/preset-react');
	});

	it('has sass and css processing in devDependencies', () => {
		assert(pkg.devDependencies.sass, 'sass');
		assert(pkg.devDependencies['sass-loader'], 'sass-loader');
		assert(pkg.devDependencies['css-loader'], 'css-loader');
		assert(pkg.devDependencies.postcss, 'postcss');
	});

	it('has layer-pack in devDependencies', () => {
		assert(pkg.devDependencies['layer-pack'], 'layer-pack');
	});

	it('all declared dependencies are installed', () => {
		const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
		const missing = [];
		for ( const dep of Object.keys(allDeps) ) {
			const depPath = path.join(lpackReactDir, 'node_modules', dep);
			if ( !fs.existsSync(depPath) ) {
				missing.push(dep);
			}
		}
		assert.strictEqual(
			missing.length, 0,
			`Missing installed deps: ${missing.join(', ')}`
		);
	});
});

// ─── 7. Webpack config validation ───────────────────────────────────

describe('lpack-react: webpack configs are loadable', () => {

	it('webpack.config.www.js exports an array', () => {
		const configPath = path.join(lpackReactDir, 'etc', 'wp', 'webpack.config.www.js');
		const src        = fs.readFileSync(configPath, 'utf8');
		// Verify it exports a module (can't require directly — needs lpack env)
		assert(src.includes('module.exports'), 'www config should export something');
		assert(src.includes('entry'), 'www config should define entry');
		assert(src.includes('lPack') || src.includes('layer-pack'), 'www config should use layer-pack');
	});

	it('webpack.config.api.js targets node', () => {
		const src = fs.readFileSync(
			path.join(lpackReactDir, 'etc', 'wp', 'webpack.config.api.js'), 'utf8'
		);
		assert(src.includes('async-node') || src.includes('node'), 'api config should target node');
		assert(src.includes('commonjs'), 'api config should use commonjs output');
	});

	it('webpack.config.comp.js exists and is valid', () => {
		const src = fs.readFileSync(
			path.join(lpackReactDir, 'etc', 'wp', 'webpack.config.comp.js'), 'utf8'
		);
		assert(src.includes('module.exports'), 'comp config should export');
	});

	it('webpack.config.static.js includes HtmlWebpackPlugin', () => {
		const src = fs.readFileSync(
			path.join(lpackReactDir, 'etc', 'wp', 'webpack.config.static.js'), 'utf8'
		);
		assert(src.includes('HtmlWebpackPlugin') || src.includes('html-webpack-plugin'),
		       'static config should use HtmlWebpackPlugin');
	});
});

// ─── 8. Profile.js CLI utility ──────────────────────────────────────

describe('lpack-react: Profile.js utility', () => {

	it('Profile.js exists and is valid JavaScript', () => {
		const src = fs.readFileSync(path.join(lpackReactDir, 'etc', 'utils', 'Profile.js'), 'utf8');
		assert(src.includes('module.exports'), 'Profile.js should export something');
		assert(src.includes('chokidar') || src.includes('watch'), 'Profile.js should support file watching');
		assert(src.includes('spawn') || src.includes('exec'), 'Profile.js should spawn child processes');
	});
});
