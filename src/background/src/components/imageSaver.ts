import { Downloads } from "../browser/Download";
import { closeWindowIfEmpty, getActiveTabsInWin } from "../browser/Tab";
import { TabConnection } from "../browser/TabConnection";
import { formatDateToReadableFormat } from "../utils/normalizeString";
import { pluralize } from "../utils/pluralize";

const NOTIFICATION_ID = "image-saver";

function getFilename(url: string): string {
	const last = new URL(url).pathname.split("/").pop() ?? "";
	return last.includes("%") ? decodeURIComponent(last) : last;
}

interface TabRules {
	tab: browser.tabs.Tab;
	rules: Addon.ImageSaverRule;
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

async function evaluateLargeTarget(e: TabRules): Promise<string[][]> {
	let matches: string[][] = [];

	const tabConnection = new TabConnection(e.tab.id);

	if (e.rules.findLargestTarget.includes("</XPath>")) {
		const regexFromTag = e.rules.findLargestTarget.includes("</RegExp>")
			? validateRegExpTag(e.rules.findLargestTarget)
			: void 0;

		const xPathFromTag = validateXPathTag(e.rules.findLargestTarget);

		if (xPathFromTag) {
			matches = (await tabConnection.queryXPath(xPathFromTag.path, xPathFromTag.attr) || [])
				.map((x) => {
					if (regexFromTag) {
						const match = x.match(regexFromTag);
						return match === null ? [] : [x, ...match.slice(1)];
					}
					return [x];
				});
		}
	}
	else {
		// treat `target` as RegExp
		matches = await tabConnection.matchAllText(e.rules.findLargestTarget) || [];
	}

	return matches.length > 0
		? matches.filter((x) => x.length > 0)
		: [];
}

function normalizeFilename(filename: string): string {
	return filename
		.replace(/[.]{2,}/g, "_")
		// put twitter image size indicators, :orig :large, before extension
		.replace(/(\.\w+):(\w+)/, "\x20$2$1");
}

function groupEnd(msg?: string) {
	if (msg) {
		console.log(msg);
	}
	console.groupEnd();
}

export default function main(settings: Addon.Settings, opts: Addon.ModuleOpts): void {

	const downloads = new Downloads({ eraseOnComplete: opts.closeTabsOnComplete });

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
			browser.notifications.clear(NOTIFICATION_ID);
			browser.notifications.create(NOTIFICATION_ID, {
				...opts.notifications,
				message
			});
		}
	}

	async function grabImagesOnPage(e: TabRules) {
		const ret: string[][] = [];
		if (e.rules.findLargest && e.rules.findLargestTarget) {
			ret.push(...await evaluateLargeTarget(e));
		}
		else {
			ret.push([e.tab.url!]);
		}
		return ret;
	}

	async function saveImagesFromTabs(tabs: TabRules[]) {

		if (tabs.length === 0) return;

		let completed = 0;

		let tabCount = tabs.length;

		const prevBrowserBadgeText = await browser.browserAction.getBadgeText({});

		for (const data of tabs) {
			browser.browserAction.setBadgeText({ text: "-" + String(tabCount--) });

			console.group(`tab#${data.tab.id}`);
			console.log(`parsing ${ data.tab.url }`);

			if (
				data.tab.url === undefined
				|| data.rules.disabled
				|| PARSED_IN_CURRENT_SESSION.includes(data.tab.url)
			) {
				groupEnd("skipping already visited url");
				continue;
			}

			const matchedTargetUrl = data.tab.url.match(new RegExp(data.rules.target));
			if (matchedTargetUrl === null) {
				console.log("E:", data);
				break;
			}

			const foundImages = await grabImagesOnPage(data);
			// -> [ ["https://i.pximg.net/..._p0.jpg#user=username", "username"], ...]

			let tabCanClose = true;

			tabCount += foundImages.length;

			for (const matched of foundImages) {
				const downloadURL = matched[0];

				browser.browserAction.setBadgeText({ text: "-" + String(tabCount--) });

				if (PARSED_IN_CURRENT_SESSION.includes(downloadURL)) {
					tabCanClose = false;
					continue;
				}

				const correctedPath = [
					replaceSavePathPlaceholders(/\$([0-9]+);/g, matchedTargetUrl),
					replaceSavePathPlaceholders(/\$1_([0-9]+);/g, matched.length > 1 ? matched : []),
					normalizePath
				].reduce((a, curr) => curr(a), data.rules.folder);

				const relativeFilepath = [
					...correctedPath.split("/"),
					normalizeFilename(getFilename(downloadURL))
				]
					.join("/")
					.replace(/\/{2,}/g, "/")
					.replace(/[ﾟ]/g, "");

				console.log(`save path: ${ relativeFilepath }`);

				await downloads.start({
					url: downloadURL,
					filename: relativeFilepath,
					conflictAction: "overwrite",
					headers: [{
						name: "Referer",
						value: data.tab.url
					}]
				})
					.then(function () {
						completed++;
						PARSED_IN_CURRENT_SESSION.push(downloadURL);
					})
					.catch(function (err: Error) {
						tabCanClose = false;
						console.error(err);
					});
			}

			groupEnd();

			if (tabCanClose && settings.imageSaverCloseOnComplete && data.tab.id) {
				browser.tabs.remove(data.tab.id);
			}
		}

		browser.browserAction.setBadgeText({ text: prevBrowserBadgeText });

		const d = `Saved ${ completed } image${ pluralize(completed) }`;
		if (completed === 0 || completed === tabs.length) {
			createNotice(d);
		}
		else {
			createNotice(`${ d } from ${ tabs.length } tab${ pluralize(tabs.length) }`);
		}
	}

	/** Filter tabs in the current window that match the regex. */
	function processTabs(tabs: browser.tabs.Tab[]): TabRules[] {
		const filtered: TabRules[] = [];

		for (const tab of tabs) {
			if (!tab.url) continue;

			for (const rules of settings.imageSaverRules) {
				if (!rules.target || !rules.folder) break;

				if (new RegExp(rules.target).test(tab.url)) {
					filtered.push({ tab, rules });
					break;
				}
			}
		}

		return filtered;
	}

	async function initImageSaveProcess(): Promise<void> {
		const tabs = processTabs(await getActiveTabsInWin());

		if (tabs.length > 0) {
			await saveImagesFromTabs(tabs);
			getActiveTabsInWin(tabs[0].tab.windowId, true);
			closeWindowIfEmpty(tabs[0].tab.windowId);
		}
		else {
			createNotice("Nothing to save.");
		}
	}

	browser.commands.onCommand.addListener(function (command) {
		switch (command) {
			case "save-images": {
				initImageSaveProcess();
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
			initImageSaveProcess();
		},
		icons: { 32: "icons/image.svg" }
	});
}
