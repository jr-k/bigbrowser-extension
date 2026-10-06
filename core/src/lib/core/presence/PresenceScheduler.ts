import PresenceState, {ElementMarkerCallback} from './PresenceState';
import PresencePayloadInterface from './PresencePayloadInterface';

class PresenceScheduler {
	mount: (payload: PresencePayloadInterface) => void;
	unmount: (payload: PresencePayloadInterface) => void;
	ms: number;
	maxAge: number;
	expirationTimestamp: number;
	checkKey?: string | undefined;
	presenceState: PresenceState;
	presenceInterval: NodeJS.Timeout;
	payload: PresencePayloadInterface | null;

	static FOREVER_ATTRIBUTE_NAME = 'wait-forever';

	constructor(checkKey: string, ms?: number, maxAge?: number, mount?: (payload: PresencePayloadInterface) => void, unmount?: (payload: PresencePayloadInterface) => void) {
		this.checkKey = checkKey;
		this.ms = ms ?? 100;
		this.maxAge = maxAge ?? 86400 * 365;
		this.presenceState = new PresenceState();
		this.presenceInterval = this._startWaitLoop();
		this.mount = mount ?? ((_: PresencePayloadInterface): void => {});
		this.unmount = unmount ?? ((_: PresencePayloadInterface): void => {});
		this.payload = null;
		this.expirationTimestamp = 0;
	}

	_scheduleExpiration = (): void => {
		this.expirationTimestamp = Date.now() + this.maxAge * 1000;
	};

	_removeMarkedElements = (): void => {
		const foreverComputedPair = PresenceScheduler.FOREVER_ATTRIBUTE_NAME + '="' + this.checkKey + '"';
		const checkKeyInstances = document.querySelectorAll<HTMLElement>('[' + foreverComputedPair + ']');
		let tagged = false;

		for (let i = 0; i < checkKeyInstances.length; i++) {
			const el = checkKeyInstances[i];

			if (el.offsetParent != null) {
				el.removeAttribute(PresenceScheduler.FOREVER_ATTRIBUTE_NAME);
			}
		}
	};

	_startWaitLoop = (): NodeJS.Timeout => {
		return setInterval(() => {
			if (!this.presenceState.checker()) {
				return;
			}

			const foreverComputedPair = PresenceScheduler.FOREVER_ATTRIBUTE_NAME + '="' + this.checkKey + '"';
			const checkKeyInstances = document.querySelectorAll<HTMLElement>('[' + foreverComputedPair + ']');
			let tagged = false;

			for (let i = 0; i < checkKeyInstances.length; i++) {
				const el = checkKeyInstances[i];

				if (el.offsetParent != null) {
					tagged = true;
					break;
				}
			}

			if (!tagged) {
				const elementMarker = (element: HTMLElement): void => {
					element.setAttribute(PresenceScheduler.FOREVER_ATTRIBUTE_NAME, this.checkKey || '');
				};

				this.payload = this.presenceState.processor(elementMarker);

				if (this.payload !== null) {
					this.mount(this.payload);
				}
			} else if (Date.now() >= this.expirationTimestamp) {
				this._scheduleExpiration();
				this._removeMarkedElements();

				if (this.payload !== null) {
					this.unmount(this.payload);
				}
			}
		}, this.ms);
	};

	waitForChecker = (readyCallback: () => boolean, processCallback: (elementMarker: ElementMarkerCallback) => PresencePayloadInterface | null): void => {
		this._scheduleExpiration();
		this.presenceState.checker = readyCallback;
		this.presenceState.processor = processCallback;
	};
}

export default PresenceScheduler;
