/**
 * Thin cross-browser layer. Chrome exposes `chrome`, Firefox exposes both `browser` and `chrome`.
 * Both implement promise-based MV3 APIs for everything used here.
 */

export type StorageArea = {
	get(keys?: string | string[] | null): Promise<{[key: string]: any}>;
	set(items: {[key: string]: any}): Promise<void>;
	remove(keys: string | string[]): Promise<void>;
};

export interface UserScriptSource {
	code?: string;
	file?: string;
}

export interface RegisteredUserScript {
	id: string;
	matches: string[];
	js: UserScriptSource[];
	runAt?: 'document_start' | 'document_end' | 'document_idle';
	world?: 'USER_SCRIPT' | 'MAIN';
	allFrames?: boolean;
	excludeMatches?: string[];
}

export interface UserScriptsApi {
	register(scripts: RegisteredUserScript[]): Promise<void>;
	update(scripts: RegisteredUserScript[]): Promise<void>;
	unregister(filter?: {ids?: string[]}): Promise<void>;
	getScripts(filter?: {ids?: string[]}): Promise<RegisteredUserScript[]>;
	configureWorld?(properties: {csp?: string; messaging?: boolean}): Promise<void>;
}

declare const browser: any;
declare const chrome: any;

export const api: any = typeof browser !== 'undefined' ? browser : chrome;

export const BROWSER_TARGET: 'chrome' | 'firefox' = typeof __BIGBROWSER_TARGET__ !== 'undefined' ? __BIGBROWSER_TARGET__ : 'chrome';
export const isFirefox = BROWSER_TARGET === 'firefox';

export const storageSync: StorageArea = api.storage.sync;
export const storageLocal: StorageArea = api.storage.local;

export const runtimeUrl = (path: string): string => api.runtime.getURL(path);

export const sendMessage = <T = any>(message: any): Promise<T> => api.runtime.sendMessage(message);

export const openOptionsPage = (): Promise<void> => api.runtime.openOptionsPage();

export const queryActiveTab = async (): Promise<{url?: string; id?: number} | null> => {
	const tabs: any[] = await api.tabs.query({active: true, currentWindow: true});

	return tabs[0] ?? null;
};

export const hasPermission = async (permission: string): Promise<boolean> => {
	try {
		return await api.permissions.contains({permissions: [permission]});
	} catch {
		return false;
	}
};

export const requestPermission = async (permission: string): Promise<boolean> => {
	try {
		return await api.permissions.request({permissions: [permission]});
	} catch {
		return false;
	}
};

/**
 * Chrome throws on property access when the user-scripts API is not enabled (developer mode off).
 * Firefox simply leaves the namespace undefined until the optional permission is granted.
 */
export const getUserScriptsApi = (): UserScriptsApi | null => {
	try {
		return (api.userScripts as UserScriptsApi | undefined) ?? null;
	} catch {
		return null;
	}
};
