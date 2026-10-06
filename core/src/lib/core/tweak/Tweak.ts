/* eslint-disable no-unused-vars */
import TweakRequest from '../router/TweakRequest';
import WaiterScheduler from '../waiter/WaiterScheduler';
import PresenceScheduler from '../presence/PresenceScheduler';
import {ElementMarkerCallback} from '../presence/PresenceState';
import PresencePayloadInterface from '../presence/PresencePayloadInterface';

/**
 * A tweak is the smallest unit a user can enable or disable: one behaviour applied to a page.
 * Plugins group several tweaks. Implementations extend this class and implement `run`.
 */
abstract class Tweak {
	constructor() {}

	waitFor = (readyCallback: () => boolean, ms?: number): Promise<any> => {
		return new WaiterScheduler(ms).waitForChecker(readyCallback);
	};

	/**
	 * Polls the page until `readyCallback` is true, then calls `processCallback` to mark the elements that were
	 * handled and build a payload. `mount` runs with that payload; `unmount` runs when the elements expire.
	 */
	checkFor = <P extends PresencePayloadInterface = PresencePayloadInterface>(
		checkKey: string,
		readyCallback: () => boolean,
		processCallback: (elementMarker: ElementMarkerCallback) => P | null,
		ms?: number,
		maxAge?: number,
		mount?: (payload: P) => void,
		unmount?: (payload: P) => void
	): void => {
		return new PresenceScheduler(checkKey, ms, maxAge, mount as ((payload: PresencePayloadInterface) => void) | undefined, unmount as ((payload: PresencePayloadInterface) => void) | undefined).waitForChecker(readyCallback, processCallback);
	};

	abstract run(request: TweakRequest): void;
}

export default Tweak;
