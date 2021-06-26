// TODO: 
// make a "matching test" for regex on settings page

import { Download } from "../utils/Download";

const config = {
	closeOnComplete: true,
	formatDateMonth: true, // 2021-jan-2 => 2021-01-02
};

const RELATIVE_PARENT_FOLDER = "baazacuda";

const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

interface RuleType {
	name: string;
	target: string;
	folder: string;
	erase?: boolean;
}
// TODO: move to settings page
const lookupRules: RuleType[] = [
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
 */
function filterTabs(tabs: browser.tabs.Tab[]): (browser.tabs.Tab & RuleType)[] {
	const filtered = [];

	for (const tab of tabs) {
		if (!tab.url) continue;

		for (const rule of lookupRules) {
			if (!rule.target || !rule.folder) break;

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
 */
async function getActiveTabsInWin(): Promise<browser.tabs.Tab[]> {
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

function normalizePath(str: string) {
	str = decodeURIComponent(str);

	// format date to a "readable" format
	if (config.formatDateMonth) {
		str = str.replace(
			/([0-9]{4})-([\w]+)-([0-9]+)/,
			function (_: string, year: string, month: string, day: string) {
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

function createNotice(msg: string) {
	browser.notifications.create({
		title: "Tab image saver",
		message: msg,
		type: "basic",
		iconUrl: "icons/web-browser-active.svg",
	});
}

function correctFolderPath(folder: string, matched: RegExpMatchArray): string {
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
	return aFolderPath;
}

async function saveTabs(tabs: (browser.tabs.Tab & RuleType)[]) {
	/** @type {number[]} */
	const completed: number[] = [];
	const parsedURLs: string[] = [];

	for (const tab of tabs) {
		const {
			url, target, folder
		} = tab;

		if (!url) continue;

		if (parsedURLs.includes(url))
			continue;

		parsedURLs.push(url);

		const matched = url.match(new RegExp(target));

		if (matched === null)
			break;

		const download = new Download({ removeAfterComplete: tab.erase ?? true });

		const filename = new URL(url).pathname.split("/").pop() ?? "";

		const relativeFilePath = [
			RELATIVE_PARENT_FOLDER,
			...normalizePath(correctFolderPath(folder, matched)).split("\\"),
			filename
		]
			.map(function (x) {
				x = x.replace(/:[a-z]+/, ""); // twitter image size indicators, :orig :large ...
				return download.normalizeFilename(x)
					.replace(/[.]{2,}/g, "_");
			})
			.join("/");

		try {
			await download.start({
				url,
				filename: relativeFilePath,
				conflictAction: "overwrite"
			})
				.catch(function (err) {
					throw new Error(err.message + ": " + relativeFilePath);
				});

			if (tab.id) {
				completed.push(tab.id);
			}
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


export default function main(): void {
	browser.commands.onCommand.addListener((command) => {
		switch (command) {
			case "save-images": {
				saveImages();
				break;
			}
		}
	});

	browser.menus.create({
		id: "save-images",
		title: "Save images from tabs",
		enabled: true,
		contexts: ["browser_action"],
		onclick: saveImages,
		icons: { 32: "icons/fi-br-picture.svg" }
	});
}