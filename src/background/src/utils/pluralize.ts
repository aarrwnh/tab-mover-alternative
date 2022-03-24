export function pluralize(x: (string | number)[] | string | number): string {
	const size: number = typeof x === "number" ? x : x.length;
	return size === 1 ? "" : "s";
}