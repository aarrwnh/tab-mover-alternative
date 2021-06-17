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

const config = {
	closeOnComplete: true,
};

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
 * Filter tabs in the current window that match the regex.
 * @param {browser.tabs.Tab[]} tabs
 * @return {(browser.tabs.Tab & RuleType)[]}
 */
function filterTabs(tabs) {
	const filtered = [];

	for (const tab of tabs) {
		for (const rule of lookupRules) {
			if (!rule.target || !rule.folder) break;

			const regex = new RegExp(rule.target);

			if (regex.test(tab.url)) {
				filtered.push({ ...tab, ...rule });
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
		discarded: false,
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
	/** @type {number[]} */
	const completed = [];

	for (const tab of tabs) {

		const matched = tab.url.match(new RegExp(tab.target));

		if (matched !== null) {
			const path = tab.folder.replace(/\$([0-9]+);/g, function (_, m) {
				// $1;, $2;, ... $n; in the folder path will be replaced
				// by corresponding match count in the `target` regex
				const index = Number(m);

				if (typeof index === "number" && matched[index]) {
					return swapIllegalCharacters(matched[index]);
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
					}

					if (tab.erase) {
						browser.downloads.onChanged.addListener(listener);
					}

					completed.push(tab.id);
				});
		}
	}

	const saveMsg = `Saved ${ completed.length } tab(s)`;

	// close tabs
	if (completed.length > 0) {
		if (config.closeOnComplete) {
			browser.tabs.remove(completed)
				.then(function () {
					createNotice(saveMsg);
				});
		}
		else {
			createNotice(saveMsg);
		}
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