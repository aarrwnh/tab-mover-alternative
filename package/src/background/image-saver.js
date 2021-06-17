"use strict";
/* globals WINDOW_ID_CURRENT */

// TODO: 
// make a "matching test" for regex on settings page

/**
 * @typedef {object} RuleType
 * @property {string} name
 * @property {string} target Regexp to match url
 * @property {string} folder Relative path
 * @property {boolean} erase Whether to remove download from downloads.
 */

const RELATIVE_PARENT_FOLDER = "baazacuda\\";

/**
 * TODO: move to settings page
 * @type {RuleType[]}
 */
const lookupRules = [
	{
		name: "twitter",
		target: "^https?://pbs.twimg.com/media/[^/]+#user=([^>#]+)",
		folder: "pic\\twitter\\$1;",
		erase: true,
	}
];

/**
 * Filter nonhidden tabs in the current window that match the regex.
 * @param {browser.tabs.Tab[]} tabs
 * @return {(browser.tabs.Tab & RuleType)[]}
 */
function filterTabs(tabs) {
	const filtered = [];

	for (const tab of tabs) {
		for (const t of lookupRules) {
			const regex = new RegExp(t.target);

			if (regex.test(tab.url)) {
				filtered.push({ ...tab, ...t });
				break;
			}
		}
	}

	return filtered;
}

/**
 * @return {Promise<browser.tabs.Tab[]>}
 */
async function getOpenedTabs() {
	return await browser.tabs.query({
		hidden: false,
		windowId: WINDOW_ID_CURRENT
	});
}

const illegalCharacters = {
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

/**
 * @param {string} str 
 * @returns {string}
 */
function normalizeFilename(str) {
	return str
		.replace(/:[a-z]+/, ""); // twitter image size indicators, :orig :large ...
}

/**
 * @param {string} str
 * @returns {string}
 */
function swapIllegalCharacters(str) {
	return normalizeFilename(str).replace(RE_ILLEGAL, function (m) {
		return illegalCharacters[m];
	});
}

/**
 * @param {string} msg 
 */
function createNotice(msg) {
	browser.notifications.create({
		title: "Tab image saver",
		message: msg,
		type: "basic"
	});
}

/**
 * @param {(browser.tabs.Tab & RuleType)[]} tabs
 */
async function saveTabs(tabs) {
	for (const tab of tabs) {

		const regex = new RegExp(tab.target);
		const match = tab.url.match(regex);

		if (match !== null) {

			const path = tab.folder.replace(/\$([0-9]+);/g, function (_, m) {
				// $1;, $2;, ... $n; in the folder path will be replaced
				// by corresponding match count in the `target` regex

				const index = Number(m);

				if (typeof index === "number" && match[index]) {
					return swapIllegalCharacters(match[index]);
				}
				else {
					throw new Error("something went wrong");
				}
			});

			const filename = [
				RELATIVE_PARENT_FOLDER,
				decodeURIComponent(path),
				"\\",
				swapIllegalCharacters(new URL(tab.url).pathname.split("/").pop())
			].join("");

			await browser.downloads.download({
				url: tab.url,
				filename,
			})
				.then(function (id) {
					function listener(downloadDelta) {
						if (
							downloadDelta.id === id
							&& downloadDelta.state.current !== "in_progress"
						) {
							browser.downloads.onChanged.removeListener(listener);
							browser.downloads.erase({ id: downloadDelta.id });
						}

						createNotice(`Saved: ${ filename }`);
					}

					if (tab.erase) {
						browser.downloads.onChanged.addListener(listener);
					}
				});
		}

		// close tabs
		browser.tabs.remove(tabs.map((tab) => tab.id))
			.then(function () {
				createNotice(`Saved ${ tabs.length } tab(s)`);
			});
	}
}

async function saveImages() {
	getOpenedTabs().then((tabs) => {
		const filtered = filterTabs(tabs);
		saveTabs(filtered);
	});
}

browser.menus.create({
	id: "save-images",
	title: "Save images from tabs",
	enabled: true,
	contexts: ["browser_action"],
	onclick: saveImages
});