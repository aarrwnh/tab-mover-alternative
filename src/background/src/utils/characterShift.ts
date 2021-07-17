/**
 * Shift (16-bit conversion) characters matched with Regex range
 * by `shiftBy` value.
 *
 * @param str String to convert.
 * @param range Regex to look for full-width characters;
 *  default should match normal alphabet (A-Za-z) and numbers (0-9)
 *	 limited to those starting with 0xFF ?
 * @param shiftBy Number (0~255) for bitwise AND.
 * @returns {string} cleaned string
 */
export default function characterShift(
	str: string,
	range = /[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]/,
	shiftBy = 0x20
): string {
	if (!str) {
		throw new SyntaxError("no string to parse");
	}

	let matched;

	while ((matched = str.match(range))) {
		str = str.replace(
			new RegExp(matched[0], "g"),
			String.fromCharCode(0xff & (matched[0].charCodeAt(0) + shiftBy))
		);
	}

	return str;
}
/**
 * Convert full-width (japanese) characters to normal (half) width.
 * 
 * @param {string} str
 * @returns {string}
 */
export function convertFullWidthToHalf(str: string): string {
	return characterShift(str, /[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]/, 0x20);
}