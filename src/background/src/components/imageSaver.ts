import { Downloads } from "../browser/Download";
import { formatDateToReadableFormat } from "../utils/normalizeString";

/** Get all opened tabs prioritizing highlighted ones. */
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

export default function main(settings: Addon.Settings, opts: Addon.ModuleOpts): void {

	const { imageSaverRules } = settings;
	const downloads = new Downloads();
	const PARSED_IN_CURRENT_SESSION: string[] = [];

	function normalizePath(str: string) {
		str = decodeURIComponent(str);

		if (opts.formatDateMonth) {
			str = formatDateToReadableFormat(str);
		}

		return str;
	}

	function createNotice(msg: string) {
		if (opts.notifications) {
			browser.notifications.create({
				...opts.notifications,
				message: msg,
			});
		}
		else {
			throw new Error("opts.notifications are required");
		}
	}

	async function saveTabs(tabs: (browser.tabs.Tab & RuleType)[]) {

		let completed = 0;

		for (const tab of tabs) {
			const { url, target, folder } = tab;

			if (!url) {
				continue;
			}

			if (PARSED_IN_CURRENT_SESSION.includes(url)) {
				continue;
			}

			PARSED_IN_CURRENT_SESSION.push(url);

			const matched = url.match(new RegExp(target));

			if (matched === null) {
				break;
			}

			const filename = new URL(url).pathname.split("/").pop() ?? "";

			const relativeFilepath = [
				opts.folder,
				...normalizePath(correctFolderPath(folder, matched)).split("\\"),
				filename
			]
				.map(function (x) {
					return downloads.normalizeFilename(
						x
							.replace(/[.]{2,}/g, "_")
							.replace(/:[a-z]+/, "") // twitter image size indicators, :orig :large ...
					);
				})
				.join("/");

			try {
				const err = await downloads.start({
					url,
					filename: relativeFilepath,
					conflictAction: "overwrite"
				}, tab.erase ?? true)
					.catch((err: Error) => err);

				if (err instanceof Error) {
					throw new Error(err.message + ": " + relativeFilepath);
				}

				if (opts.closeTabsOnComplete && tab.id) {
					browser.tabs.remove(tab.id);
				}

				completed++;

				console.log("saved image:", tab.url);
			}
			catch (err) {
				console.error(err);
			}
		}

		createNotice(`Saved images from ${ completed } tab(s)`);
	}

	/**
	 * Filter tabs in the current window that match the regex.
	 */
	function filterTabs(tabs: browser.tabs.Tab[]): (browser.tabs.Tab & RuleType)[] {
		const filtered = [];

		for (const tab of tabs) {
			if (!tab.url) continue;

			for (const rule of imageSaverRules) {
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
		icons: { 32: "icons/image.svg" }
	});
}