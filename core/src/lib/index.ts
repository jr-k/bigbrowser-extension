/**
 * Big Browser core: SDK for plugin authors + runtime orchestrating tweaks on a page.
 *
 * The bundle is exposed as the `BigBrowser` global in the JS world where it is injected,
 * so plugin bundles can treat the "bigbrowser" package as an external resolved to that global.
 */
import Runtime from './core/runtime/Runtime';
import Tweak from './core/tweak/Tweak';
import TweakRequest from './core/router/TweakRequest';
import TweakRouter from './core/router/TweakRouter';
import WaiterScheduler from './core/waiter/WaiterScheduler';
import WaiterState from './core/waiter/WaiterState';
import PresenceScheduler from './core/presence/PresenceScheduler';
import PresenceState, {ElementMarkerCallback} from './core/presence/PresenceState';
import PresencePayloadInterface from './core/presence/PresencePayloadInterface';
import type {PluginDefinition, PluginManifest, PluginRuntimeConfig, TweakConstructor, TweakManifest, TweakRoute} from './core/types';

const runtime = Runtime.shared();

/**
 * Entry point used by plugin bundles.
 *
 * ```ts
 * import {definePlugin} from 'bigbrowser';
 * export default definePlugin({id: 'github', tweaks: {project_repository: ProjectRepository}});
 * ```
 */
const definePlugin = (definition: PluginDefinition): PluginDefinition => {
	runtime.definePlugin(definition);

	return definition;
};

/** Entry point used by the extension to push the user's configuration before a plugin bundle is evaluated. */
const configure = (config: PluginRuntimeConfig): void => {
	runtime.configure(config);
};

const running = (): string[] => runtime.running();

const VERSION: string = typeof __BIGBROWSER_VERSION__ !== 'undefined' ? __BIGBROWSER_VERSION__ : '0.0.0';

/** @deprecated Use `Tweak` instead. Kept so legacy Tampermonkey controllers keep compiling. */
const TamperController = Tweak;
/** @deprecated Use `TweakRequest` instead. */
const TamperRequest = TweakRequest;

export {
	VERSION,
	definePlugin,
	configure,
	running,
	runtime,
	Tweak,
	TweakRequest,
	TweakRouter,
	TamperController,
	TamperRequest,
	WaiterScheduler,
	WaiterState,
	PresenceScheduler,
	PresenceState,
};

export type {ElementMarkerCallback, PresencePayloadInterface, PluginDefinition, PluginManifest, PluginRuntimeConfig, TweakConstructor, TweakManifest, TweakRoute};
