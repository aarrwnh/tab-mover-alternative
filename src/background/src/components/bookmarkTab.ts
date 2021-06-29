import { Downloads } from "../browser/Download";
import { replaceIllegalCharacters } from "../utils/replaceIllegalCharacters";
import { TabUtils } from "../browser/Tab";
import { TabConnection } from "../browser/TabConnection";

export default function main(
	settings: Addon.Settings,
	opts: Addon.ModuleOpts
): void {

	function makeNotificationOpts(message: string) {
		if (opts.notifications) {
			return { ...opts.notifications, message };
		}
		throw new Error("opts.notifications are required");
	}

	const downloads = new Downloads();

	type InternetShortcutFields = {
		url: string;
		origin: string;
		description?: string;
	}

	class Bookmarks extends TabUtils {

		constructor(private subdirList: string[]) {
			super();
		}

		private _createURLFileBody({ url, origin, description }: InternetShortcutFields) {
			const format = [
				"[DEFAULT]",
				`BASEURL=${ origin }`,
				"[InternetShortcut]",
				`URL=${ url }`
			];
			if (description) {
				format.push(`Comment=${ description.slice(0, 100) }`);
			}
			return format.join("\n");
		}

		private _createObjectURL({ url, origin, description }: InternetShortcutFields): string {
			const urlFileBodyRaw = this._createURLFileBody({ url, origin, description });
			const urlFileBodyBlob = new Blob([urlFileBodyRaw], { type: "text/plain" });
			return URL.createObjectURL(urlFileBodyBlob);
		}

		private async _composeFilename(
			title: string,
			hostname: string,
			date?: string
		): Promise<string> {
			const subdirOrPrefix = this.subdirList.includes(hostname)
				? `${ hostname }/`
				: `[${ hostname }] `;

			const filename = opts.folder
				+ "/"
				+ subdirOrPrefix
				+ replaceIllegalCharacters(title).slice(0, 150)
				+ (date ? ` (${ date })` : "")
				+ ".url";

			return filename;
		}

		async saveSelectedTabs(): Promise<number[] | void> {
			const tabs = await this.getCurrentlyHighlightedInWindow();
			const processedTabs: number[] = [];

			for (const tab of tabs) {
				const { url, title } = tab;

				if (!url) continue;

				if (!/^http/.test(url)) {
					downloads.showNotification(
						makeNotificationOpts(`can't save: "${ url }"`)
					);
					continue;
				}

				const { hostname, origin } = new URL(url);
				const tabConnection = new TabConnection(tab.id);
				const urlFileBodyObjectURL = this._createObjectURL({
					url,
					origin,
					description: await tabConnection.querySelector([
						'meta[itemprop="description"]',
						'meta[name="twitter:description"]',
						'meta[property="twitter:description"]',
					].join(","))
				});

				const date = await tabConnection.querySelector('meta[itemprop="datePublished"]');  // yt: content="2020-04-01"

				if (!title) {
					throw new Error("no title");
				}

				const filename = await this._composeFilename(title, hostname, date);

				if ((41 + filename.length) > 260) {
					console.log("filename.length", 41 + filename.length);
				}

				await downloads.start({
					conflictAction: "overwrite",
					url: urlFileBodyObjectURL,
					filename
				}, true)
					.then(function () {
						if (tab.id) {
							processedTabs.push(tab.id);
						}

						downloads.showNotification(
							makeNotificationOpts(
								(opts.notifications ? opts.notifications.message : "") + `: ${ title }`
							)
						);
					})
					.catch(function (err: Error) {
						if (err instanceof Error) {
							downloads.showNotification(
								makeNotificationOpts(err.name + ": " + err.message)
							);
						}
					});
			}

			return processedTabs;
		}
	}

	const bookmarks = new Bookmarks(
		settings.bookmarkAlwaysToChildFolder
	);

	async function saveBookmark(): Promise<void> {
		const tabIDs = await bookmarks.saveSelectedTabs();
		if (opts.closeTabsOnComplete && tabIDs && tabIDs.length > 0) {
			bookmarks.closeTabs(tabIDs);
		}
	}

	browser.menus.create({
		id: "save-as-bookmark",
		title: "save current tab as bookmark file",
		enabled: true,
		contexts: ["browser_action"],
		onclick: saveBookmark,
		icons: { 32: "icons/bookmark.svg" }
	});

	browser.commands.onCommand.addListener((command) => {
		switch (command) {
			case "save-bookmark": {
				saveBookmark();
				break;
			}
		}
	});
}
