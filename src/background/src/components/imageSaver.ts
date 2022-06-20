import { Downloads } from "../browser/Download";
import { closeWindowIfEmpty, getActiveTabsInWin } from "../browser/Tab";
import { TabConnection } from "../browser/TabConnection";
import { formatDateToReadableFormat } from "../utils/normalizeString";
import { pluralize } from "../utils/pluralize";

function getFilename(url: string): string {
	return new URL(url).pathname.split("/").pop() ?? "";
}

type CustomTab = browser.tabs.Tab & Addon.ImageSaverRule;

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

async function evaluateLargeTarget(tab: CustomTab): Promise<string[][]> {
	let matches: string[][] = [];

	const tabConnection = new TabConnection(tab.id);

	if (tab.findLargestTarget.includes("</XPath>")) {
		const regExpFromTag = tab.findLargestTarget.includes("</RegExp>")
			? validateRegExpTag(tab.findLargestTarget)
			: void 0;

		const XPathFromTag = validateXPathTag(tab.findLargestTarget);

		if (XPathFromTag) {
			matches = (await tabConnection.queryXPath(XPathFromTag.path, XPathFromTag.attr) || [])
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
		matches = await tabConnection.matchAllText(tab.findLargestTarget) || [];
	}

	return matches
		? matches.filter((x) => x.length > 0)
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

	const PARSED_IN_CURRENT_SESSION: string[] = [];

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
	}

	async function grabImagesOnPage(tab: CustomTab) {
		const ret: string[][] = [];
		if (tab.findLargest && tab.findLargestTarget) {
			ret.push(...await evaluateLargeTarget(tab));
		}
		else {
			ret.push([tab.url!]);
		}
		return ret;
	}

	async function saveImagesFromTabs(tabs: CustomTab[]) {

		if (tabs.length === 0) return;

		let completed = 0;

		let tabCount = tabs.length;

		const prevBrowserBadgeText = await browser.browserAction.getBadgeText({});

		for (const tab of tabs) {
			await browser.browserAction.setBadgeText({ text: "-" + String(tabCount--) });

			if (
				tab.url === undefined
				|| tab.disabled
				|| PARSED_IN_CURRENT_SESSION.includes(tab.url)
			) {
				continue;
			}

			const matchedTargetUrl = tab.url.match(new RegExp(tab.target));
			if (matchedTargetUrl === null) {
				console.log("E:", tab);
				break;
			}

			const foundImages = await grabImagesOnPage(tab);
			for (const matched of foundImages) {
				const downloadURL = matched[0];

				if (PARSED_IN_CURRENT_SESSION.includes(downloadURL)) {
					continue;
				}

				const correctedPath = [
					replaceSavePathPlaceholders(/\$([0-9]+);/g, matchedTargetUrl),
					replaceSavePathPlaceholders(/\$1_([0-9]+);/g, matched.length > 1 ? matched : []),
					normalizePath
				].reduce((a, curr) => curr(a), tab.folder);

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
						value: tab.url
					}]
				}, true);

				if (downloadId !== -1) {
					if (settings.imageSaverCloseOnComplete && tab.id) {
						browser.tabs.remove(tab.id);
					}

					console.log("saved image:", tab.url, tab.url === downloadURL ? null : downloadURL);

					completed++;
				}
				else {
					console.error("something went wrong", downloadId, downloadURL)
				}

				PARSED_IN_CURRENT_SESSION.push(downloadURL);
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

	/** Filter tabs in the current window that match the regex. */
	function processTabs(tabs: browser.tabs.Tab[]): CustomTab[] {
		const filtered = [];

		for (const tab of tabs) {
			if (!tab.url) continue;

			for (const rule of settings.imageSaverRules) {
				if (!rule.target || !rule.folder) break;

				if (new RegExp(rule.target).test(tab.url)) {
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
			await saveImagesFromTabs(tabs);
			getActiveTabsInWin(tabs[0].windowId, true);
			closeWindowIfEmpty(tabs[0].windowId);
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
