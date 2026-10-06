type Child = Node | string | null | undefined | false;

/** Tiny DOM builder: el('div', {class: 'x', onclick: fn}, 'text', otherNode) */
export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: {[key: string]: any} = {}, ...children: Child[]): HTMLElementTagNameMap[K] => {
	const node = document.createElement(tag);

	Object.keys(attrs).forEach((key) => {
		const value = attrs[key];

		if (value === null || value === undefined || value === false) {
			return;
		}

		if (key.startsWith('on') && typeof value === 'function') {
			node.addEventListener(key.slice(2).toLowerCase(), value);
		} else if (key === 'class') {
			node.className = value;
		} else if (key === 'checked' || key === 'disabled' || key === 'value') {
			(node as any)[key] = value;
		} else {
			node.setAttribute(key, String(value));
		}
	});

	children.forEach((child) => {
		if (child === null || child === undefined || child === false) {
			return;
		}

		node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
	});

	return node;
};

export const toggle = (checked: boolean, onChange: (checked: boolean) => void, options: {disabled?: boolean; label?: string} = {}): HTMLLabelElement => {
	const input = el('input', {
		type: 'checkbox',
		checked,
		disabled: options.disabled,
		'aria-label': options.label,
		onchange: () => onChange(input.checked),
	});

	return el('label', {class: 'toggle'}, input, el('span'));
};

export const clear = (node: Element): void => {
	while (node.firstChild) {
		node.removeChild(node.firstChild);
	}
};

export const relativeTime = (iso: string | null | undefined): string => {
	if (!iso) {
		return 'never';
	}

	const diff = Date.now() - new Date(iso).getTime();
	const minutes = Math.round(diff / 60000);

	if (minutes < 1) {
		return 'just now';
	}

	if (minutes < 60) {
		return `${minutes} min ago`;
	}

	const hours = Math.round(minutes / 60);

	if (hours < 48) {
		return `${hours} h ago`;
	}

	return new Date(iso).toLocaleDateString();
};

export const formatBytes = (bytes: number | undefined): string => {
	if (!bytes) {
		return '';
	}

	return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(0)} KB`;
};
