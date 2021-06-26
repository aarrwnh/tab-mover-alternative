const illegalCharacters = {
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
};

const RE_ILLEGAL = new RegExp("[" + Object.keys(illegalCharacters).map((x) => "\\" + x).join("") + "]", "g");

export function normalizeFilename(str: string): string {
	return str.replace(RE_ILLEGAL, function (m) {
		// @ts-ignore
		return illegalCharacters[m];
	});
}