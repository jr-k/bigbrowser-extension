import {storageLocal, storageSync} from './browser';
import {
	CachedBundle,
	DEFAULT_SERVER_URL,
	EngineStatus,
	IndexState,
	LEGACY_DEFAULT_SERVER_URLS,
	Preferences,
	defaultPreferences,
} from './types';

const PREFS_KEY = 'preferences';
const INDEX_KEY = 'indexState';
const ENGINE_KEY = 'engineStatus';
const BUNDLES_KEY = 'bundles';

export const getPreferences = async (): Promise<Preferences> => {
	const data = await storageSync.get(PREFS_KEY);
	const stored = data[PREFS_KEY] ?? {};
	const storedServerUrl = typeof stored.serverUrl === 'string' ? stored.serverUrl : DEFAULT_SERVER_URL;
	const serverUrl = LEGACY_DEFAULT_SERVER_URLS.includes(storedServerUrl) ? DEFAULT_SERVER_URL : storedServerUrl;

	return {...defaultPreferences(), ...stored, serverUrl, plugins: stored.plugins ?? {}};
};

export const setPreferences = async (prefs: Preferences): Promise<void> => {
	await storageSync.set({[PREFS_KEY]: prefs});
};

export const updatePreferences = async (mutate: (prefs: Preferences) => void): Promise<Preferences> => {
	const prefs = await getPreferences();

	mutate(prefs);
	await setPreferences(prefs);

	return prefs;
};

export const getIndexState = async (): Promise<IndexState> => {
	const data = await storageLocal.get(INDEX_KEY);

	return data[INDEX_KEY] ?? {index: null, fetchedAt: null, error: null};
};

export const setIndexState = async (state: IndexState): Promise<void> => {
	await storageLocal.set({[INDEX_KEY]: state});
};

export const getEngineStatus = async (): Promise<EngineStatus> => {
	const data = await storageLocal.get(ENGINE_KEY);

	return data[ENGINE_KEY] ?? {available: false, reason: null, registered: [], errors: {}, appliedAt: null};
};

export const setEngineStatus = async (status: EngineStatus): Promise<void> => {
	await storageLocal.set({[ENGINE_KEY]: status});
};

export const getBundles = async (): Promise<{[pluginId: string]: CachedBundle}> => {
	const data = await storageLocal.get(BUNDLES_KEY);

	return data[BUNDLES_KEY] ?? {};
};

export const setBundles = async (bundles: {[pluginId: string]: CachedBundle}): Promise<void> => {
	await storageLocal.set({[BUNDLES_KEY]: bundles});
};

export const STORAGE_KEYS = {PREFS_KEY, INDEX_KEY, ENGINE_KEY, BUNDLES_KEY};
