/**
 * Background (service worker on Chrome, event page on Firefox).
 *
 * Responsibilities:
 *   - keep a local copy of the plugin index served by the Big Browser server
 *   - turn the user's subscriptions into user-script registrations (see lib/engine.ts)
 *   - answer status / refresh requests from the options page and the popup
 */
import {api} from './lib/browser';
import {fetchIndex} from './lib/api';
import {applyConfiguration, currentEngineStatus} from './lib/engine';
import {Message, StatusResponse} from './lib/messages';
import {STORAGE_KEYS, getIndexState, getPreferences, setIndexState} from './lib/storage';

const REFRESH_ALARM = 'bigbrowser:refresh-index';
const REFRESH_PERIOD_MINUTES = 15;
const VERSION: string = typeof __BIGBROWSER_VERSION__ !== 'undefined' ? __BIGBROWSER_VERSION__ : '0.0.0';

let applying: Promise<void> | null = null;

const refreshIndex = async (): Promise<void> => {
	const prefs = await getPreferences();
	const previous = await getIndexState();

	try {
		const index = await fetchIndex(prefs.serverUrl);

		await setIndexState({index, fetchedAt: new Date().toISOString(), error: null});
	} catch (error: any) {
		await setIndexState({...previous, error: error?.message ?? String(error)});
	}
};

/** Serialises concurrent apply requests so registrations never interleave. */
const apply = (): Promise<void> => {
	if (applying) {
		return applying;
	}

	applying = applyConfiguration()
		.then(() => undefined)
		.catch((error) => console.error('[BigBrowser] apply failed', error))
		.finally(() => {
			applying = null;
		});

	return applying;
};

const bootstrap = async (): Promise<void> => {
	await refreshIndex();
	await apply();
	await api.alarms.create(REFRESH_ALARM, {periodInMinutes: REFRESH_PERIOD_MINUTES});
};

api.runtime.onInstalled.addListener(() => {
	bootstrap().catch((error: unknown) => console.error('[BigBrowser] bootstrap failed', error));
});

api.runtime.onStartup.addListener(() => {
	bootstrap().catch((error: unknown) => console.error('[BigBrowser] bootstrap failed', error));
});

api.alarms.onAlarm.addListener((alarm: {name: string}) => {
	if (alarm.name === REFRESH_ALARM) {
		refreshIndex()
			.then(apply)
			.catch((error: unknown) => console.error('[BigBrowser] scheduled refresh failed', error));
	}
});

// Preferences are edited from the options page / popup: every change is applied right away
api.storage.onChanged.addListener((changes: {[key: string]: unknown}, area: string) => {
	if (area === 'sync' && changes[STORAGE_KEYS.PREFS_KEY]) {
		apply();
	}
});

api.runtime.onMessage.addListener((message: Message, _sender: unknown, sendResponse: (response: StatusResponse) => void) => {
	const respond = async (): Promise<StatusResponse> => {
		if (message.type === 'refresh-index') {
			await refreshIndex();
			await apply();
		} else if (message.type === 'apply') {
			await apply();
		}

		const [engine, index] = await Promise.all([currentEngineStatus(), getIndexState()]);

		return {engine, index, version: VERSION};
	};

	respond()
		.then(sendResponse)
		.catch((error) => {
			console.error('[BigBrowser] message handling failed', error);
			sendResponse({engine: {available: false, reason: null, registered: [], errors: {'*': String(error)}, appliedAt: null}, index: {index: null, fetchedAt: null, error: String(error)}, version: VERSION});
		});

	return true;
});
