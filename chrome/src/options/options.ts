import {isFirefox, requestPermission, sendMessage} from '../lib/browser';
import {normalizeServerUrl} from '../lib/api';
import {StatusResponse} from '../lib/messages';
import {getPreferences, updatePreferences} from '../lib/storage';
import {EngineStatus, IndexState, Preferences} from '../lib/types';
import {clear, el, relativeTime, toggle} from '../ui/dom';
import {pluginCard} from '../ui/plugin-card';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector<T>(selector) as T;

let prefs: Preferences;
let status: StatusResponse | null = null;
let filter = '';

const renderIndex = (index: IndexState): void => {
	const pill = $('#index-pill');
	const meta = $('#index-meta');
	const error = $('#index-error');

	pill.className = `pill ${index.error ? 'bad' : index.index ? 'ok' : 'warn'}`;
	pill.textContent = index.error ? 'Unreachable' : index.index ? 'Connected' : 'No index yet';

	clear(meta);

	if (index.index) {
		meta.appendChild(el('div', {}, `${index.index.plugins.length} plugin(s) · fetched ${relativeTime(index.fetchedAt)}`));
		meta.appendChild(el('div', {}, `${index.index.repository}${index.index.commit ? ` @ ${index.index.commit.slice(0, 7)}` : ''}`));

		const repo = $<HTMLAnchorElement>('#repo-link');
		repo.href = `https://github.com/${index.index.repository}`;
	}

	error.hidden = !index.error;
	error.textContent = index.error ?? '';
};

const renderEngine = (engine: EngineStatus): void => {
	const pill = $('#engine-pill');
	const help = $('#engine-help');
	const errors = $('#engine-errors');
	const meta = $('#engine-meta');

	pill.className = `pill ${engine.available ? 'ok' : 'bad'}`;
	pill.textContent = engine.available ? 'Armed' : 'Disarmed';

	clear(help);
	help.hidden = engine.available;

	if (!engine.available) {
		if (engine.reason === 'permission') {
			help.appendChild(el('div', {}, 'Firefox needs your consent before this extension can inject user scripts.'));
			help.appendChild(
				el('div', {style: 'margin-top:8px'}, el('button', {class: 'btn btn-primary', type: 'button', onclick: grantPermission}, 'Allow user scripts'))
			);
		} else if (engine.reason === 'developer_mode') {
			help.appendChild(el('div', {}, 'Chrome only lets an extension inject user scripts once you allow it:'));
			help.appendChild(
				el(
					'ol',
					{},
					el('li', {}, 'Open ', el('code', {}, 'chrome://extensions'), ' and find Big Browser'),
					el('li', {}, 'Click Details, then enable "Allow User Scripts" (Chrome 138+)'),
					el('li', {}, 'On older versions, enable "Developer mode" (top-right) instead'),
					el('li', {}, 'Come back here and click Recheck')
				)
			);
		} else {
			help.appendChild(el('div', {}, 'This browser does not implement the user-scripts API (Chrome 120+ / Firefox 136+ required).'));
		}
	}

	const errorKeys = Object.keys(engine.errors ?? {});
	errors.hidden = errorKeys.length === 0;
	clear(errors);
	errorKeys.forEach((key) => errors.appendChild(el('div', {}, el('code', {}, key), ` — ${engine.errors[key]}`)));

	clear(meta);
	meta.appendChild(el('div', {}, `${engine.registered.length} plugin(s) injected · applied ${relativeTime(engine.appliedAt)}`));
};

const renderPlugins = (): void => {
	const container = $('#plugins');
	const count = $('#plugin-count');
	const plugins = status?.index.index?.plugins ?? [];
	const needle = filter.trim().toLowerCase();
	const visible = needle
		? plugins.filter((plugin) => [plugin.id, plugin.name, plugin.description ?? '', ...plugin.tweaks.flatMap((tweak) => [tweak.id, tweak.name, tweak.description ?? ''])].join(' ').toLowerCase().includes(needle))
		: plugins;

	clear(container);
	count.textContent = plugins.length ? `${plugins.length}` : '';

	if (!status?.index.index) {
		container.appendChild(el('div', {class: 'empty'}, el('strong', {}, 'No catalogue yet'), 'Point the extension at a Big Browser server, then save and refresh.'));
		return;
	}

	if (visible.length === 0) {
		container.appendChild(el('div', {class: 'empty'}, el('strong', {}, plugins.length ? 'Nothing matches' : 'Empty catalogue'), plugins.length ? 'Try another filter.' : 'The plugins repository has not been indexed yet.'));
		return;
	}

	visible.forEach((plugin) => {
		container.appendChild(
			pluginCard(plugin, prefs, {
				error: status?.engine.errors[plugin.id],
				onChange: (next) => {
					prefs = next;
				},
			})
		);
	});
};

const render = (): void => {
	if (status) {
		renderIndex(status.index);
		renderEngine(status.engine);
		$('#version').textContent = `v${status.version} · ${isFirefox ? 'Firefox' : 'Chrome'}`;
	}

	renderPlugins();
};

const refresh = async (message: 'refresh-index' | 'status' | 'apply' = 'status'): Promise<void> => {
	const buttons = document.querySelectorAll<HTMLButtonElement>('#refresh, #server-save');

	buttons.forEach((button) => (button.disabled = true));

	try {
		status = await sendMessage<StatusResponse>({type: message});
		prefs = await getPreferences();
		render();
	} finally {
		buttons.forEach((button) => (button.disabled = false));
	}
};

const grantPermission = async (): Promise<void> => {
	const granted = await requestPermission('userScripts');

	if (granted) {
		await refresh('apply');
	}
};

const init = async (): Promise<void> => {
	prefs = await getPreferences();

	const input = $<HTMLInputElement>('#server-url');
	input.value = prefs.serverUrl;

	$('#server-form').addEventListener('submit', async (event) => {
		event.preventDefault();
		const url = normalizeServerUrl(input.value);
		input.value = url;
		prefs = await updatePreferences((p) => {
			p.serverUrl = url;
		});
		await refresh('refresh-index');
	});

	$('#refresh').addEventListener('click', () => refresh('refresh-index'));
	$('#engine-recheck').addEventListener('click', () => refresh('apply'));

	$('#filter').addEventListener('input', (event) => {
		filter = (event.target as HTMLInputElement).value;
		renderPlugins();
	});

	$('#debug-toggle').appendChild(
		toggle(
			prefs.debug,
			async (value) => {
				prefs = await updatePreferences((p) => {
					p.debug = value;
				});
			},
			{label: 'Debug logs'}
		)
	);

	await refresh('status');
};

init().catch((error) => console.error('[BigBrowser] options init failed', error));
