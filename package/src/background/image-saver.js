"use strict";
/* globals WINDOW_ID_CURRENT */

// TODO: 
// make a "matching test" for regex on settings page

const config = {
	closeOnComplete: true,
	formatDateMonth: true, // 2021-jan-2 => 2021-01-02
};

const RELATIVE_PARENT_FOLDER = "baazacuda";
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
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * @typedef {object} RuleType
 * @property {string} name
 * @property {string} target Regexp to match url
 * @property {string} folder Relative path
 * @property {boolean | undefined} erase Whether to remove download from downloads.
 */

/**
 * TODO: move to settings page
 * @type {RuleType[]}
 */
const lookupRules = [
	{
		name: "twitter",
		target: "^https?://pbs.twimg.com/media/[^/]+#user=([^>#]+)",
		folder: "pic\\twitter\\$1;"
	},
	{
		// http://cloud2.akibablog.net/2021/may/31/wh33/250.jpg
		name: "akibablog",
		target: "^http://cloud[0-9].akibablog.net/([0-9]+)/([\\w\\d-]+)/([0-9]+)/([\\w\\d]+)",
		folder: "pic\\akibablog\\$1;-$2;-$3;__$4;"
	},
	{
		// http://www.daikikougyou.com/2021item/fuukiiin_san/fuukiiin_000.jpg
		name: "http://www.daikikougyou.com/",
		target: "^http://www.daikikougyou.com/([0-9]+)item/([\\d\\w_]+)/",
		folder: "pic\\daikikougyou\\$1;_$2;"
	},
	{
		// https://ogre.natalie.mu/media/news/comic/2021/0521/saekano_katoumegumi_racequeen_figure_1.jpg
		name: "https://ogre.natalie.mu",
		target: "^https://(?:\\w+).natalie.mu/media/news/(\\w+)/([0-9]+)/([0-9]+)/",
		folder: "pic\\natalie.mu\\$1;\\$2;\\$3;"
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

			// let'sforcethis
			if (!rule.erase) {
				rule.erase = true;
			}

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
		windowId: browser.windows.WINDOW_ID_CURRENT,
	});

	const filterNotHighlighted = tabs.filter((tab) => tab.highlighted);

	return filterNotHighlighted.length > 1
		? filterNotHighlighted
		: tabs;
}

function normalizePath(str) {
	str = decodeURIComponent(str);

	// format date to a "readable" format
	if (config.formatDateMonth) {
		str = str.replace(
			/([0-9]{4})-([\w]+)-([0-9]+)/,
			function (_, year, month, day) {
				const index = months.indexOf(month);
				if (index !== -1) {
					return [
						year,
						String(index + 1).padStart(2, "0"),
						day.padStart(2, "0")
					].join("-");
				}
				return _;
			}
		);
	}

	return str;
}

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
	return normalizeFilename(str)
		.replace(RE_ILLEGAL, function (m) {
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

		const aFolderPath = folder.replace(/\$([0-9]+);/g, function (_, m) {
			// $1;, $2;, ... $n; in the folder path will be replaced
			// by corresponding match count in the `target` regex
			const index = Number(m);

			if (typeof index === "number" && matched[index]) {
				return matched[index];
			}
			else {
				throw new Error("something went wrong");
			}
		});

		const filename = new URL(url).pathname.split("/").pop();

		const savePath = [
			RELATIVE_PARENT_FOLDER,
			...normalizePath(aFolderPath).split("\\"),
			filename
		]
			.map(function (x) {
				return swapIllegalCharacters(x).replace(/[.]{2,}/g, "_");
			})
			.join("/");

		try {
			const downloadId = await browser.downloads.download({ url, filename: savePath })
				.catch(function (err) {
					throw new Error(err.message + ": " + savePath);
				});

			if (tab.erase) {
				browser.downloads.onChanged.addListener(function (delta) {
					onDownloadEnd(delta, downloadId);
				});
			}

			completed.push(tab.id);
		}
		catch (err) {
			console.error(err);
		}

		console.log("saved image:", tab.url);
	}

	// close tabs
	browser.tabs.remove(config.closeOnComplete ? completed : [])
		.then(function () {
			createNotice(`Saved images from ${ completed.length } tab(s)`);
		});
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
	onclick: saveImages,
	icons: {
		32: "src/icons/fi-br-picture.svg"
	}
});

browser.commands.onCommand.addListener((command) => {
	switch (command) {
		case "save-images": {
			saveImages();
			break;
		}
	}
});
