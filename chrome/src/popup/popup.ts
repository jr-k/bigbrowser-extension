import {openOptionsPage, queryActiveTab, sendMessage} from '../lib/browser';
import {urlMatchesPatterns} from '../lib/match';
import {StatusResponse} from '../lib/messages';
import {getPreferences} from '../lib/storage';
import {Preferences} from '../lib/types';
import {clear, el} from '../ui/dom';
import {pluginCard} from '../ui/plugin-card';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector<T>(selector) as T;

let prefs: Preferences;
let status: StatusResponse | null = null;
let tabUrl = '';

const render = (): void => {
	const container = $('#plugins-here');
	const enginePill = $('#engine-pill');
	const engineWarning = $('#engine-warning');
	const indexWarning = $('#index-warning');

	clear(container);

	if (!status) {
		return;
	}

	enginePill.className = `pill ${status.engine.available ? 'ok' : 'bad'}`;
	enginePill.textContent = status.engine.available ? 'Armed' : 'Disarmed';

	engineWarning.hidden = status.engine.available;
	engineWarning.textContent = status.engine.available ? '' : 'User scripts are not allowed yet. Open all plugins to enable them.';

	indexWarning.hidden = !status.index.error;
	indexWarning.textContent = status.index.error ? `Index server: ${status.index.error}` : '';

	const plugins = (status.index.index?.plugins ?? []).filter((plugin) => tabUrl && urlMatchesPatterns(tabUrl, plugin.matches));

	if (plugins.length === 0) {
		container.appendChild(el('div', {class: 'empty'}, el('strong', {}, 'Nothing here'), tabUrl ? 'No indexed plugin targets this page.' : 'This tab cannot be tweaked.'));
		return;
	}

	plugins.forEach((plugin) => {
		container.appendChild(
			pluginCard(plugin, prefs, {
				compact: true,
				error: status?.engine.errors[plugin.id],
				onChange: (next) => {
					prefs = next;
				},
			})
		);
	});
};

const refresh = async (message: 'status' | 'refresh-index'): Promise<void> => {
	const button = $<HTMLButtonElement>('#refresh');
	button.disabled = true;

	try {
		status = await sendMessage<StatusResponse>({type: message});
		prefs = await getPreferences();
		render();
	} finally {
		button.disabled = false;
	}
};

const init = async (): Promise<void> => {
	const tab = await queryActiveTab();
	tabUrl = tab?.url ?? '';

	try {
		// Zero-width spaces after dots let long hosts wrap on label boundaries instead of mid-word.
$('#host').textContent = tabUrl ? new URL(tabUrl).host.replace(/\./g, '.\u200b') : 'No page';
	} catch {
		$('#host').textContent = 'No page';
	}

	$('#options').addEventListener('click', () => openOptionsPage());
	$('#refresh').addEventListener('click', () => refresh('refresh-index'));

	await refresh('status');
};

init().catch((error) => console.error('[BigBrowser] popup init failed', error));
