export function debounce(
	timeout = 0,
	callback: <T extends void>(...args: any[]) => T | void,
	immediate = false
): (...args: any[]) => void {

	let timeoutId: ReturnType<typeof setTimeout>;

	return function (this: any, ...args: []) {
		clearTimeout(timeoutId);

		timeoutId = setTimeout(() => {
			callback.apply(this, args);
		}, timeout);

		if (immediate && !timeout) {
			callback.apply(this, args);
		}
	};
}