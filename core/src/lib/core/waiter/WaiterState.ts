class WaiterState {
	checker: () => boolean;
	resolver: () => void;

	constructor(checker?: () => boolean, resolver?: () => void) {
		this.checker = checker || (() => true);
		this.resolver = resolver || (() => {});
	}
}

export default WaiterState;
