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
};

const escapedChars = Object.keys(ILLEGAL_SYSTEM_CHAR).map((x) => "\\" + x).join("");
const RE_ILLEGAL = new RegExp("[" + escapedChars + "]", "g");

export function replaceIllegalCharacters(str: string): string {
	return str.replace(RE_ILLEGAL, function (m) {
		return ILLEGAL_SYSTEM_CHAR[m];
	});
}
