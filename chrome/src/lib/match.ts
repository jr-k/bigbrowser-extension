/**
 * WebExtension match pattern evaluation (https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
 * used by the UI to know which plugins target a given tab. The browser itself does the real matching.
 */
const escapeRegExp = (value: string): string => value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

export const matchPatternToRegExp = (pattern: string): RegExp | null => {
	if (pattern === '<all_urls>') {
		return /^(https?|wss?|ftp|file):\/\//;
	}

	const parsed = /^(\*|https?|wss?|ftp|file):\/\/(\*|\*\.[^/*]+|[^/*]+)?(\/.*)$/.exec(pattern);

	if (!parsed) {
		return null;
	}

	const [, scheme, host = '', path] = parsed;
	const schemeRe = scheme === '*' ? 'https?' : escapeRegExp(scheme);
	let hostRe: string;

	if (host === '*') {
		hostRe = '[^/]*';
	} else if (host.startsWith('*.')) {
		hostRe = `([^/]+\\.)?${escapeRegExp(host.slice(2))}`;
	} else {
		hostRe = escapeRegExp(host);
	}

	const pathRe = escapeRegExp(path).replace(/\*/g, '.*');

	return new RegExp(`^${schemeRe}://${hostRe}(:\\d+)?${pathRe}$`);
};

export const urlMatchesPatterns = (url: string, patterns: string[]): boolean => {
	return patterns.some((pattern) => {
		const re = matchPatternToRegExp(pattern);

		return re !== null && re.test(url);
	});
};
