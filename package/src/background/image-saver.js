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
 * Get all opened tabs prioritizing highlighted ones. 
 * @return {Promise<browser.tabs.Tab[]>}
 */
async function getActiveTabsInWin() {
	const tabs = await browser.tabs.query({
		discarded: false,
		hidden: false,
		windowId: WINDOW_ID_CURRENT,
	});

	const filterNotHighlighted = tabs.filter((tab) => tab.highlighted);

	return filterNotHighlighted.length > 1
		? filterNotHighlighted
		: tabs;
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
		type: "basic",
		iconUrl: "src/icons/web-browser-active.svg",
	});
}


/**
 * @param {browser.downloads._OnChangedDownloadDelta} downloadDelta 
 * @param {number} downloadId 
 */
function onDownloadEnd(downloadDelta, downloadId) {
	if (
		downloadDelta.id === downloadId
		&& downloadDelta.state.current !== "in_progress"
	) {
		browser.downloads.onChanged.removeListener(onDownloadEnd);
		browser.downloads.erase({ id: downloadDelta.id });
	}
}

/**
 * @param {(browser.tabs.Tab & RuleType)[]} tabs
 */
async function saveTabs(tabs) {
	/** @type {number[]} */
	const completed = [];

	for (const tab of tabs) {
		const { url, target, folder } = tab;

		const matched = url.match(new RegExp(target));

		if (matched === null)
			break;

		const path = folder.replace(/\$([0-9]+);/g, function (_, m) {
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
			swapIllegalCharacters(new URL(url).pathname.split("/").pop())
		].join("");

		const downloadId = await browser.downloads.download({ url, filename });

		if (tab.erase) {
			browser.downloads.onChanged.addListener(function (delta) {
				onDownloadEnd(delta, downloadId);
			});
		}

		completed.push(tab.id);

		console.log("saved:", tab.url);
	}

	const saveMsg = `Saved images from ${ completed.length } tab(s)`;

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

function saveImages() {
	getActiveTabsInWin()
		.then(function (tabs) {
			const filtered = filterTabs(tabs);

			if (filtered.length > 0) {
				saveTabs(filtered);
			}
			else {
				createNotice("Nothing to save.");
			}
		});
}

browser.menus.create({
	id: "save-images",
	title: "Save images from tabs",
	enabled: true,
	contexts: ["browser_action"],
	onclick: saveImages
});