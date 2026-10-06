import {Router} from 'uri-template-router';

import type {RouteMatch, TweakRoute} from '../types';

/**
 * Matches a URL against the routes declared by a tweak.
 * A fresh router is used for every pattern so templates never leak between tweaks.
 */
class TweakRouter {
	static match = (routes: TweakRoute[], url: string): RouteMatch | null => {
		let oUrl: URL;

		try {
			oUrl = new URL(url);
		} catch {
			return null;
		}

		// Templates describe the path only: query string and fragment are matched separately
		const bare = `${oUrl.origin}${oUrl.pathname}`;
		const query: {[key: string]: string} = {};

		oUrl.searchParams.forEach((value, key) => {
			query[key] = value;
		});

		for (let r = 0; r < routes.length; r++) {
			const route = routes[r];

			if ((route.protocol && !oUrl.protocol.replace(':', '').match(route.protocol)) || (route.host && !oUrl.host.match(route.host))) {
				continue;
			}

			const router = new Router();

			try {
				router.addTemplate(route.pattern, {}, route.pattern);
			} catch (error: any) {
				console.error(`[BigBrowser] Invalid route pattern "${route.pattern}": ${error.message}`);
				continue;
			}

			const resolved = router.resolveURI(bare);

			if (resolved) {
				return {
					uri: url,
					uriTemplate: resolved.uriTemplate ?? route.pattern,
					params: resolved.params ?? {},
					query,
					hash: oUrl.hash.replace(/^#/, ''),
				};
			}
		}

		return null;
	};
}

export default TweakRouter;
