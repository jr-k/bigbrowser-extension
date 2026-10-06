import PresencePayloadInterface from './PresencePayloadInterface';

export type ElementMarkerCallback = (element: HTMLElement) => void;

class PresenceState {
	checker: () => boolean;
	processor: (elementMarkerCallback: ElementMarkerCallback) => PresencePayloadInterface | null;

	constructor(checker?: () => boolean, processor?: (elementMarkerCallback: ElementMarkerCallback) => PresencePayloadInterface | null) {
		this.checker = checker || (() => true);
		this.processor =
			processor ||
			(() => {
				return null;
			});
	}
}

export default PresenceState;
