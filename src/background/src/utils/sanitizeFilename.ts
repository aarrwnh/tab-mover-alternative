const ILLEGAL_SYSTEM_CHAR: {
	[key: string]: string;
} = {
	"|": "｜",
	"\"": "\u201d", // ”
	"*": "\uff0a",  // ＊
	"/": "\uff0f", // ／
	":": "\uff1a", // ：
	"<": "\uff1c",  // ＜
	">": "\uff1e",  // ＞
	"?": "\uff1f", // ？
	"\\": "\uff3c", // ＼
	"\u3000": "\x20", // full-width space
	"\u200d": "",
};

// const controlRegex = /[\x00-\x1f\x80-\x9f]/g;
// const reservedRegex = /^\.+$/;
// const windowsReservedRegex = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
// const windowsTrailingRegex = /[\. ]+$/;
// const multipleSpacesRegex = /\s\s+/g;

const emoji = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
const escapedChars = Object.keys(ILLEGAL_SYSTEM_CHAR).map((x) => "\\" + x).join("");
const RE_ILLEGAL = new RegExp("[" + escapedChars + "]", "g");

export function sanitizeFilename(str: string): string {
	return str
		.replace(RE_ILLEGAL, function (m) {
			return ILLEGAL_SYSTEM_CHAR[m];
		})
		.replaceAll(emoji, "")
		// .replace(controlRegex, "")
		// .replace(reservedRegex, "")
		// .replace(windowsReservedRegex, "")
		// .replace(windowsTrailingRegex, "")
		// .replace(multipleSpacesRegex, " ")
		.trim();
}
