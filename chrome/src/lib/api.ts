import {IndexPlugin, PluginIndex} from './types';

const request = async (url: string, init?: RequestInit): Promise<Response> => {
	try {
		return await fetch(url, init);
	} catch (error: unknown) {
		const reason = error instanceof Error ? error.message : String(error);

		throw new Error(`Cannot reach ${url} (${reason})`);
	}
};

export const normalizeServerUrl = (url: string): string => {
	let trimmed = (url || '').trim();

	if (trimmed === '') {
		return '';
	}

	if (!/^https?:\/\//i.test(trimmed)) {
		trimmed = `http://${trimmed}`;
	}

	return trimmed.replace(/\/+$/, '');
};

export const fetchIndex = async (serverUrl: string): Promise<PluginIndex> => {
	const base = normalizeServerUrl(serverUrl);

	if (base === '') {
		throw new Error('No server URL configured');
	}

	const response = await request(`${base}/api/index`, {headers: {Accept: 'application/json'}, cache: 'no-store'});

	if (!response.ok) {
		throw new Error(`Index server answered ${response.status} ${response.statusText}`);
	}

	const payload = await response.json();

	if (!payload || !Array.isArray(payload.plugins)) {
		throw new Error('Malformed index payload');
	}

	return payload as PluginIndex;
};

export const fetchBundle = async (serverUrl: string, plugin: IndexPlugin): Promise<string> => {
	const url = /^https?:\/\//i.test(plugin.bundle_url) ? plugin.bundle_url : `${normalizeServerUrl(serverUrl)}${plugin.bundle_url}`;
	const response = await request(url, {cache: 'no-store'});

	if (!response.ok) {
		throw new Error(`Bundle for "${plugin.id}" answered ${response.status} ${response.statusText}`);
	}

	return response.text();
};
