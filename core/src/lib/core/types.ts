import type Tweak from './tweak/Tweak';

/**
 * A URL rule used to decide whether a tweak must run on the current page.
 * `pattern` is an RFC 6570 URI template (ex: "https://example.com/deal{/dealId}{/path*}").
 * `protocol` and `host` are optional regular expressions applied before the template matching.
 */
export interface TweakRoute {
	protocol?: string;
	host?: string;
	pattern: string;
}

/**
 * Result of matching the current URL against a tweak route.
 */
export interface RouteMatch {
	uri: string;
	uriTemplate: string;
	params: {[key: string]: any};
	query: {[key: string]: string};
	hash: string;
}

/**
 * Static description of a tweak, as declared in the plugin's `plugin.json`.
 */
export interface TweakManifest {
	id: string;
	name: string;
	description?: string;
	default?: boolean;
	routes: TweakRoute[];
}

/**
 * Static description of a plugin, as declared in `plugin.json` and served by the index server.
 * `matches` uses the WebExtension match pattern syntax (ex: "https://example.com/*").
 */
export interface PluginManifest {
	id: string;
	name: string;
	description?: string;
	version: string;
	author?: string;
	homepage?: string;
	iconUrl: string;
	matches: string[];
	tweaks: TweakManifest[];
}

export type TweakConstructor = new () => Tweak;

/**
 * What a plugin bundle registers at runtime: the mapping between tweak ids and their implementation.
 */
export interface PluginDefinition {
	id: string;
	tweaks: {[tweakId: string]: TweakConstructor};
}

/**
 * Per-plugin configuration pushed by the extension before the plugin bundle is evaluated.
 */
export interface PluginRuntimeConfig {
	manifest: PluginManifest;
	enabledTweaks: string[];
	debug?: boolean;
}
