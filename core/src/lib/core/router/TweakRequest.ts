import type {PluginManifest, RouteMatch, TweakManifest} from '../types';

/**
 * Context handed to a tweak when it starts: the matched route and the plugin/tweak identity.
 */
class TweakRequest {
	pluginId: string;
	tweakId: string;
	plugin: PluginManifest | null;
	tweak: TweakManifest | null;

	/** Stable key, safe to use as a DOM id prefix: "<pluginId>_<tweakId>" */
	routeName: string;
	params: {[key: string]: any};
	query: {[key: string]: string};
	hash: string;
	uri: string;
	uriTemplate: string;

	constructor(match?: RouteMatch | null, context?: {plugin: PluginManifest; tweak: TweakManifest}) {
		this.pluginId = context?.plugin.id ?? '';
		this.tweakId = context?.tweak.id ?? '';
		this.plugin = context?.plugin ?? null;
		this.tweak = context?.tweak ?? null;
		this.routeName = context ? `${this.pluginId}_${this.tweakId}` : '';

		this.params = match?.params ?? {};
		this.query = match?.query ?? {};
		this.hash = match?.hash ?? '';
		this.uri = match?.uri ?? document.location.href;
		this.uriTemplate = match?.uriTemplate ?? '';
	}
}

export default TweakRequest;
