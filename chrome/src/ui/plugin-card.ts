import {IndexPlugin, Preferences, isPluginSubscribed, isTweakEnabled} from '../lib/types';
import {updatePreferences} from '../lib/storage';
import {el, formatBytes, toggle} from './dom';

interface CardOptions {
	compact?: boolean;
	error?: string;
	onChange?: (prefs: Preferences) => void;
}

const pluginIcon = (plugin: IndexPlugin): HTMLElement =>
	el('div', {class: 'plugin-icon', 'aria-hidden': 'true'}, el('img', {src: plugin.iconUrl, alt: ''}));

export const pluginCard = (plugin: IndexPlugin, prefs: Preferences, options: CardOptions = {}): HTMLElement => {
	const subscribed = isPluginSubscribed(prefs, plugin.id);
	const card = el('article', {class: `plugin${subscribed ? '' : ' off'}`, 'data-plugin': plugin.id});

	const setSubscribed = async (value: boolean) => {
		const next = await updatePreferences((p) => {
			p.plugins[plugin.id] = {...(p.plugins[plugin.id] ?? {tweaks: {}}), subscribed: value};
		});

		card.classList.toggle('off', !value);
		card.querySelectorAll<HTMLInputElement>('.tweak input').forEach((input) => (input.disabled = !value));
		options.onChange?.(next);
	};

	const setTweak = async (tweakId: string, value: boolean) => {
		const next = await updatePreferences((p) => {
			const pref = p.plugins[plugin.id] ?? {subscribed: false, tweaks: {}};

			pref.tweaks = {...pref.tweaks, [tweakId]: value};
			p.plugins[plugin.id] = pref;
		});

		options.onChange?.(next);
	};

	const meta = el(
		'div',
		{class: 'plugin-meta data'},
		el('span', {}, `v${plugin.version}`),
		plugin.author ? el('span', {}, plugin.author) : null,
		!options.compact && plugin.bundle_size ? el('span', {}, formatBytes(plugin.bundle_size)) : null,
		!options.compact ? el('span', {title: plugin.matches.join('\n')}, plugin.matches.length === 1 ? plugin.matches[0] : `${plugin.matches.length} match patterns`) : null
	);

	const head = el(
		'header',
		{class: 'plugin-head'},
		pluginIcon(plugin),
		el(
			'div',
			{style: 'flex:1;min-width:0'},
			el('div', {class: 'plugin-title'}, el('h3', {}, plugin.name), el('span', {class: 'data muted'}, plugin.id)),
			meta,
			plugin.description && !options.compact ? el('p', {class: 'plugin-desc'}, plugin.description) : null,
			options.error ? el('div', {class: 'notice bad', style: 'margin-top:10px'}, options.error) : null
		),
		toggle(subscribed, setSubscribed, {label: `Subscribe to ${plugin.name}`})
	);

	const tweaks = el(
		'ul',
		{class: 'tweaks'},
		...plugin.tweaks.map((tweak) =>
			el(
				'li',
				{class: 'tweak'},
				el(
					'div',
					{class: 'tweak-body'},
					el('div', {class: 'tweak-name'}, tweak.name, el('span', {class: 'data'}, tweak.id)),
					tweak.description ? el('div', {class: 'tweak-desc'}, tweak.description) : null,
					!options.compact && tweak.routes?.length ? el('div', {class: 'tweak-routes'}, ...tweak.routes.map((route) => el('span', {class: 'route', title: route.pattern}, route.pattern))) : null
				),
				toggle(isTweakEnabled(prefs, plugin, tweak), (value) => setTweak(tweak.id, value), {disabled: !subscribed, label: `Enable ${tweak.name}`})
			)
		)
	);

	card.appendChild(head);
	card.appendChild(tweaks);

	return card;
};
