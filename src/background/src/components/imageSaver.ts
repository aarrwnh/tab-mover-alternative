import { Downloads } from "../browser/Download";
import { closeWindowIfEmpty, getActiveTabsInWin } from "../browser/Tab";
import { TabConnection } from "../browser/TabConnection";
import { formatDateToReadableFormat } from "../utils/normalizeString";
import { pluralize } from "../utils/pluralize";

function getFilename(url: string): string {
	return new URL(url).pathname.split("/").pop() ?? "";
}

function replaceSavePathPlaceholders(regex: RegExp, placeholders: string[]) {
	return function (folder: string) {
		return folder.replace(regex, function (_: string, m: any) {
			// $1; $2; ... $n; in the folder path will be replaced
			// by corresponding match count in the `target` regex
			const index = Number(m);

			if (
				typeof index === "number"
				&& placeholders
				&& placeholders.length > 1
				&& placeholders[index]
			) {
				return placeholders[index];
			}
			else {
				throw new Error("something went wrong");
			}
		});
	};
}

// ns.xpathRegExp = /^<XPath\s*attribute=(?:"|'|)([^"'\s]+)(?:"|'| )\s*>(.+)<\/XPath>\s*(?:<RegExp>(.+)<\/RegExp>)?/i;
const RE_XPATH = /<XPath(?: attribute=([\w'"]+))?>(.+)<\/XPath>/;
const RE_REGEXP = /<RegExp>(.+)<\/RegExp>/;

function validateXPathTag(target: string): {
	attr: "src" | "href";
	path: string;
} | void {
	const matchXPath = target.match(RE_XPATH);
	if (matchXPath !== null) {
		const [, attr, path] = matchXPath;
		if (!attr) {
			console.error("XPath attribute value should be either 'src' or 'href'");
		}

		return {
			attr: (attr.slice(1, -1) as "href") ?? "src",
			path // TODO: validate/sanitize/escape
		};
	}
}

function validateRegExpTag(target: string): RegExp | void {
	const match = target.match(RE_REGEXP);
	if (match !== null) {
		return new RegExp(match[1]);
	}
}

async function evaluateLargeTarget(target: string, tabId?: number): Promise<string[][]> {
	let matchAll: string[][] = [];

	const tabConnection = new TabConnection(tabId);

	if (target.includes("</XPath>")) {
		const regExpFromTag = target.includes("</RegExp>") ? validateRegExpTag(target) : void 0;

		const XPathFromTag = validateXPathTag(target);

		if (XPathFromTag) {
			matchAll = (await tabConnection.queryXPath(XPathFromTag.path, XPathFromTag.attr))
				.map((x) => {
					if (regExpFromTag) {
						const match = x.match(regExpFromTag);
						return match === null ? [] : [x, ...match.slice(1)];
					}
					return [x];
				});
		}
	}
	// treat `target` as RegExp and 
	else {
		matchAll = await tabConnection.matchAllText(target);
	}

	return matchAll
		? matchAll.filter((x) => x.length > 0)
		: [];
}

function normalizeFilename(filename: string): string {
	return filename
		.replace(/[.]{2,}/g, "_")
		// put twitter image size indicators, :orig :large, before extension
		.replace(/(\.\w+):(\w+)/, "\x20$2$1");
}

export default function main(settings: Addon.Settings, opts: Addon.ModuleOpts): void {

	const downloads = new Downloads();
	const SAVED_IN_CURRENT_SESSION: string[] = [];

	function normalizePath(str: string) {
		str = decodeURIComponent(str);

		if (opts.formatDateMonth) {
			str = formatDateToReadableFormat(str);
		}

		// clean illegal characters in folder path
		str = str.replace(/\.+$/, "");

		return str;
	}

	function createNotice(message: string) {
		if (opts.notifications) {
			browser.notifications.create({ ...opts.notifications, message });
		}
		else {
			throw new Error("opts.notifications are required");
		}
	}

	async function saveTabs(tabs: (browser.tabs.Tab & Addon.ImageSaverRule)[]) {

		let completed = 0;
		let tabCount = tabs.length;

		if (tabCount === 0) return;

		const prevBrowserBadgeText = await browser.browserAction.getBadgeText({});

		for (const tab of tabs) {
			const {
				disabled,
				url,
				target,
				folder: folderLocation,
				findLargest,
				findLargestTarget
			} = tab;

			await browser.browserAction.setBadgeText({ text: "-" + String(tabCount--) });

			if (!url || disabled) {
				continue;
			}

			if (SAVED_IN_CURRENT_SESSION.includes(url)) {
				continue;
			}

			const matchedTargetUrl = url.match(new RegExp(target));
			if (matchedTargetUrl === null) {
				console.log("E: ", url, target);
				break;
			}

			const currentTabDownloadURLs: string[][] = [];

			if (findLargest && findLargestTarget) {
				const matchAll = await evaluateLargeTarget(findLargestTarget, tab.id); // => RegExpMatchArray[]
				if (matchAll.length > 0) {
					currentTabDownloadURLs.push(...matchAll);
				}
			}
			else {
				currentTabDownloadURLs.push([url]);
			}

			for (const downloadUrlMatch of currentTabDownloadURLs) {

				const downloadURL = downloadUrlMatch[0];
				if (SAVED_IN_CURRENT_SESSION.includes(downloadURL)) {
					continue;
				}

				const correctedPath = [
					replaceSavePathPlaceholders(/\$([0-9]+);/g, matchedTargetUrl),
					replaceSavePathPlaceholders(/\$1_([0-9]+);/g, downloadUrlMatch.length > 1 ? downloadUrlMatch : []),
					normalizePath
				].reduce((a, curr) => curr(a), folderLocation);

				const relativeFilepath = [
					...correctedPath.split("/"),
					normalizeFilename(getFilename(downloadURL))
				]
					.join("/")
					.replace(/\/{2,}/g, "/")
					.replace(/[ﾟ]/g, "");

				console.debug(downloadURL, relativeFilepath);

				const downloadId = await downloads.start({
					url: downloadURL,
					filename: relativeFilepath,
					// TODO: change to "prompt" when implemented in FF?
					conflictAction: "overwrite",
					headers: [{
						name: "Referer",
						value: url
					}]
				}, true);

				if (downloadId !== -1) {
					if (settings.imageSaverCloseOnComplete && tab.id) {
						browser.tabs.remove(tab.id);
					}

					console.log("saved image:", tab.url, tab.url === downloadURL ? null : downloadURL);

					SAVED_IN_CURRENT_SESSION.push(downloadURL);

					completed++;
				}
			}
		}

		await browser.browserAction.setBadgeText({ text: prevBrowserBadgeText });

		const d = `Saved ${ completed } image${ pluralize(completed) }`;
		if (completed === 0 || completed === tabs.length) {
			createNotice(d);
		}
		else {
			createNotice(`${ d } from ${ tabs.length } tab${ pluralize(tabs.length) }`);
		}
	}

	/**
	 * Filter tabs in the current window that match the regex.
	 */
	function processTabs(tabs: browser.tabs.Tab[]): (browser.tabs.Tab & Addon.ImageSaverRule)[] {
		const filtered = [];

		for (const tab of tabs) {
			if (!tab.url) continue;

			for (const rule of settings.imageSaverRules) {
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

	async function saveImages(): Promise<void> {
		const tabs = processTabs(await getActiveTabsInWin());

		if (tabs.length > 0) {
			await saveTabs(tabs);
			getActiveTabsInWin(tabs[0].windowId, true).then(closeWindowIfEmpty);
		}
		else {
			createNotice("Nothing to save.");
		}
	}

	browser.commands.onCommand.addListener(function (command) {
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
		onclick() {
			saveImages();
		},
		icons: { 32: "icons/image.svg" }
	});
}
