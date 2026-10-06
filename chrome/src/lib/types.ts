import type {PluginManifest, TweakManifest} from '@bigbrowser/core';

/** A tweak as returned by the index server */
export interface IndexTweak extends TweakManifest {
	default: boolean;
}

/** A plugin as returned by the index server */
export interface IndexPlugin extends PluginManifest {
	tweaks: IndexTweak[];
	bundle_url: string;
	bundle_sha: string;
	bundle_size: number;
	updated_at: string;
}

export interface PluginIndex {
	generated_at: string;
	repository: string;
	commit: string | null;
	plugins: IndexPlugin[];
}

export interface PluginPreference {
	subscribed: boolean;
	tweaks: {[tweakId: string]: boolean};
}

export interface Preferences {
	serverUrl: string;
	debug: boolean;
	plugins: {[pluginId: string]: PluginPreference};
}

export interface IndexState {
	index: PluginIndex | null;
	fetchedAt: string | null;
	error: string | null;
}

export type EngineUnavailableReason = 'unsupported' | 'developer_mode' | 'permission';

export interface EngineStatus {
	available: boolean;
	reason: EngineUnavailableReason | null;
	registered: string[];
	errors: {[pluginId: string]: string};
	appliedAt: string | null;
}

export interface CachedBundle {
	sha: string;
	code: string;
}

export const DEFAULT_SERVER_URL = 'http://127.0.0.1:8001';
export const LEGACY_DEFAULT_SERVER_URLS = ['http://localhost:8000', 'http://127.0.0.1:8000'];

export const defaultPreferences = (): Preferences => ({
	serverUrl: DEFAULT_SERVER_URL,
	debug: false,
	plugins: {},
});

export const isPluginSubscribed = (prefs: Preferences, pluginId: string): boolean => {
	return prefs.plugins[pluginId]?.subscribed === true;
};

export const isTweakEnabled = (prefs: Preferences, plugin: IndexPlugin, tweak: IndexTweak): boolean => {
	const value = prefs.plugins[plugin.id]?.tweaks?.[tweak.id];

	return typeof value === 'boolean' ? value : tweak.default !== false;
};

export const enabledTweakIds = (prefs: Preferences, plugin: IndexPlugin): string[] => {
	return plugin.tweaks.filter((tweak) => isTweakEnabled(prefs, plugin, tweak)).map((tweak) => tweak.id);
};
