import Tweak from '../tweak/Tweak';
import TweakRequest from '../router/TweakRequest';
import TweakRouter from '../router/TweakRouter';
import type {PluginDefinition, PluginManifest, PluginRuntimeConfig, RouteMatch, TweakManifest} from '../types';

interface LoadedPlugin {
	definition: PluginDefinition;
	config: PluginRuntimeConfig | null;
	instances: {[tweakId: string]: Tweak};
	started: boolean;
}

const GLOBAL_KEY = '__BIGBROWSER_RUNTIME__';

/**
 * Orchestrates plugins on the current page.
 *
 * Boot sequence (driven by the extension):
 *   1. the runtime bundle is evaluated (this file) and exposes `BigBrowser` globally
 *   2. `BigBrowser.configure({manifest, enabledTweaks})` is called for every subscribed plugin
 *   3. each plugin bundle is evaluated and calls `BigBrowser.definePlugin({id, tweaks})`
 *
 * As soon as a plugin has both a config and a definition its enabled tweaks matching the URL are started.
 * Without any config (sandbox / dev mode) every tweak of a defined plugin is started on matching URLs.
 */
class Runtime {
	plugins: {[pluginId: string]: LoadedPlugin} = {};
	configs: {[pluginId: string]: PluginRuntimeConfig} = {};
	debug = false;

	/**
	 * Returns the runtime shared by every script evaluated in the same JS world,
	 * even if the runtime bundle is injected several times (once per plugin).
	 */
	static shared = (): Runtime => {
		const root: any = globalThis as any;

		if (!root[GLOBAL_KEY]) {
			root[GLOBAL_KEY] = new Runtime();
		}

		return root[GLOBAL_KEY] as Runtime;
	};

	configure = (config: PluginRuntimeConfig): void => {
		const pluginId = config.manifest.id;

		this.debug = this.debug || !!config.debug;
		this.configs[pluginId] = config;

		const plugin = this.plugins[pluginId];

		if (plugin) {
			plugin.config = config;
			this._start(plugin);
		}

		this._log(`configured plugin "${pluginId}" with tweaks [${config.enabledTweaks.join(', ')}]`);
	};

	definePlugin = (definition: PluginDefinition): void => {
		if (!definition || typeof definition.id !== 'string' || typeof definition.tweaks !== 'object') {
			throw new Error('[BigBrowser] definePlugin expects {id: string, tweaks: {[id]: TweakClass}}');
		}

		const plugin: LoadedPlugin = {
			definition,
			config: this.configs[definition.id] ?? null,
			instances: {},
			started: false,
		};

		this.plugins[definition.id] = plugin;
		this._log(`defined plugin "${definition.id}" with tweaks [${Object.keys(definition.tweaks).join(', ')}]`);

		if (plugin.config || Object.keys(this.configs).length === 0) {
			this._start(plugin);
		}
	};

	/** Tweaks currently running on this page, as "<pluginId>:<tweakId>" */
	running = (): string[] => {
		const keys: string[] = [];

		Object.keys(this.plugins).forEach((pluginId) => {
			Object.keys(this.plugins[pluginId].instances).forEach((tweakId) => {
				keys.push(`${pluginId}:${tweakId}`);
			});
		});

		return keys;
	};

	_start = (plugin: LoadedPlugin): void => {
		if (plugin.started) {
			return;
		}

		plugin.started = true;

		const manifest: PluginManifest = plugin.config?.manifest ?? this._syntheticManifest(plugin.definition);
		const enabled: string[] = plugin.config?.enabledTweaks ?? Object.keys(plugin.definition.tweaks);
		const url = document.location.href;

		manifest.tweaks.forEach((tweakManifest: TweakManifest) => {
			if (enabled.indexOf(tweakManifest.id) === -1) {
				return;
			}

			const TweakClass = plugin.definition.tweaks[tweakManifest.id];

			if (!TweakClass) {
				console.warn(`[BigBrowser] Tweak "${manifest.id}:${tweakManifest.id}" is declared in the manifest but not implemented in the bundle`);
				return;
			}

			// A tweak without any route runs everywhere the plugin is injected
			const routes = tweakManifest.routes ?? [];
			const result = routes.length === 0 ? null : TweakRouter.match(routes, url);

			if (routes.length > 0 && !result) {
				this._log(`tweak "${manifest.id}:${tweakManifest.id}" does not match ${url}`);
				return;
			}

			this._run(plugin, manifest, tweakManifest, TweakClass, result);
		});
	};

	_run = (plugin: LoadedPlugin, manifest: PluginManifest, tweakManifest: TweakManifest, TweakClass: new () => Tweak, match: RouteMatch | null): void => {
		let instance: Tweak;

		try {
			instance = new TweakClass();
		} catch (error) {
			console.error(`[BigBrowser] Unable to instantiate tweak "${manifest.id}:${tweakManifest.id}"`, error);
			return;
		}

		if (typeof instance.run !== 'function') {
			console.error(`[BigBrowser] Tweak "${manifest.id}:${tweakManifest.id}" has no 'run' method`);
			return;
		}

		plugin.instances[tweakManifest.id] = instance;
		console.debug(`[BigBrowser] Invoke ${manifest.id}:${tweakManifest.id}`);

		try {
			instance.run(new TweakRequest(match, {plugin: manifest, tweak: tweakManifest}));
		} catch (error) {
			console.error(`[BigBrowser] Tweak "${manifest.id}:${tweakManifest.id}" crashed`, error);
		}
	};

	_syntheticManifest = (definition: PluginDefinition): PluginManifest => {
		return {
			id: definition.id,
			name: definition.id,
			version: '0.0.0',
			iconUrl: 'https://example.invalid/icon.svg',
			matches: [],
			tweaks: Object.keys(definition.tweaks).map((tweakId) => ({
				id: tweakId,
				name: tweakId,
				routes: [],
			})),
		};
	};

	_log = (message: string): void => {
		if (this.debug) {
			console.debug(`[BigBrowser] ${message}`);
		}
	};
}

export default Runtime;
