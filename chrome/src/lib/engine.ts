import {RegisteredUserScript, getUserScriptsApi, hasPermission, isFirefox} from './browser';
import {fetchBundle} from './api';
import {getBundles, getEngineStatus, getIndexState, getPreferences, setBundles, setEngineStatus} from './storage';
import {CachedBundle, EngineStatus, EngineUnavailableReason, IndexPlugin, enabledTweakIds, isPluginSubscribed} from './types';

const SCRIPT_PREFIX = 'bigbrowser:';
const RUNTIME_FILE = 'runtime.js';

export const detectEngine = async (): Promise<{available: boolean; reason: EngineUnavailableReason | null}> => {
	const api = getUserScriptsApi();

	if (api) {
		return {available: true, reason: null};
	}

	if (isFirefox) {
		return {available: false, reason: (await hasPermission('userScripts')) ? 'unsupported' : 'permission'};
	}

	return {available: false, reason: 'developer_mode'};
};

const bootstrapCode = (plugin: IndexPlugin, enabledTweaks: string[], debug: boolean): string => {
	const config = JSON.stringify({manifest: plugin, enabledTweaks, debug});

	return `;(function(){try{BigBrowser.configure(${config});}catch(e){console.error('[BigBrowser] bootstrap failed for ${plugin.id}',e);}})();`;
};

const ensureBundle = async (serverUrl: string, plugin: IndexPlugin, cache: {[pluginId: string]: CachedBundle}): Promise<string> => {
	const cached = cache[plugin.id];

	if (cached && cached.sha === plugin.bundle_sha && cached.code) {
		return cached.code;
	}

	const code = await fetchBundle(serverUrl, plugin);

	cache[plugin.id] = {sha: plugin.bundle_sha, code};

	return code;
};

/**
 * Re-registers every subscribed plugin as a user script, from the cached index and preferences.
 * Each registration evaluates, in order: the core runtime, the user's configuration, the plugin bundle.
 */
export const applyConfiguration = async (): Promise<EngineStatus> => {
	const [prefs, indexState, detection] = await Promise.all([getPreferences(), getIndexState(), detectEngine()]);
	const status: EngineStatus = {
		available: detection.available,
		reason: detection.reason,
		registered: [],
		errors: {},
		appliedAt: new Date().toISOString(),
	};

	const api = getUserScriptsApi();

	if (!api) {
		await setEngineStatus(status);

		return status;
	}

	if (api.configureWorld) {
		try {
			await api.configureWorld({messaging: true});
		} catch {
			// Not supported by every engine, harmless
		}
	}

	const plugins = (indexState.index?.plugins ?? []).filter((plugin) => isPluginSubscribed(prefs, plugin.id));
	const cache = await getBundles();
	const scripts: RegisteredUserScript[] = [];

	for (const plugin of plugins) {
		try {
			const code = await ensureBundle(prefs.serverUrl, plugin, cache);
			const enabled = enabledTweakIds(prefs, plugin);

			if (!Array.isArray(plugin.matches) || plugin.matches.length === 0) {
				throw new Error('plugin declares no match pattern');
			}

			scripts.push({
				id: `${SCRIPT_PREFIX}${plugin.id}`,
				matches: plugin.matches,
				runAt: 'document_idle',
				world: 'USER_SCRIPT',
				js: [{file: RUNTIME_FILE}, {code: bootstrapCode(plugin, enabled, prefs.debug)}, {code}],
			});
		} catch (error: any) {
			status.errors[plugin.id] = error?.message ?? String(error);
		}
	}

	// Drop bundles of plugins we no longer subscribe to
	Object.keys(cache).forEach((pluginId) => {
		if (!plugins.some((plugin) => plugin.id === pluginId)) {
			delete cache[pluginId];
		}
	});
	await setBundles(cache);

	try {
		await api.unregister();
	} catch (error: any) {
		status.errors['*'] = `unregister failed: ${error?.message ?? error}`;
	}

	for (const script of scripts) {
		try {
			await api.register([script]);
			status.registered.push(script.id.slice(SCRIPT_PREFIX.length));
		} catch (error: any) {
			status.errors[script.id.slice(SCRIPT_PREFIX.length)] = error?.message ?? String(error);
		}
	}

	await setEngineStatus(status);

	return status;
};

export const currentEngineStatus = async (): Promise<EngineStatus> => {
	const [stored, detection] = await Promise.all([getEngineStatus(), detectEngine()]);

	return {...stored, available: detection.available, reason: detection.reason};
};
