/**
 * Local sandbox: boots the runtime with an inline demo plugin so the SDK can be exercised
 * without the extension or the index server (`yarn start`).
 */
import {definePlugin, configure, running, Tweak, TweakRequest, VERSION} from '../lib';

const title = `Big Browser ${VERSION} - Sandbox`;
document.title = title;

const body = document.querySelector('body');

if (body) {
	body.innerHTML = `<h1>${title}</h1><p id="status">Booting…</p>`;
}

class HelloTweak extends Tweak {
	run = (request: TweakRequest): void => {
		this.checkFor(
			`${request.routeName}_hello`,
			() => document.querySelector('#status') !== null,
			(mark) => {
				const status = document.querySelector<HTMLElement>('#status');

				if (status) {
					mark(status);
					status.textContent = `Tweak ${request.pluginId}:${request.tweakId} is running on ${request.uri}`;
				}

				return null;
			},
			200
		);
	};
}

configure({
	debug: true,
	enabledTweaks: ['hello'],
	manifest: {
		id: 'sandbox',
		name: 'Sandbox',
		version: '0.0.0',
		matches: ['http://localhost/*'],
		tweaks: [{id: 'hello', name: 'Hello', routes: [{pattern: 'http://localhost:9000{/path*}'}]}],
	},
});

definePlugin({
	id: 'sandbox',
	tweaks: {hello: HelloTweak},
});

console.debug('[sandbox] running tweaks:', running());
