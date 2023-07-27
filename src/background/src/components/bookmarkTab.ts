import { Downloads } from "../browser/Download";
import { sanitizeFilename } from "../utils/sanitizeFilename";
import { getActiveTabsInWin, Tabs } from "../browser/Tab";
import { TabConnection } from "../browser/TabConnection";

const NOTIFICATION_ID = "bookmark-saver";

type InternetShortcutFields = {
	url: string;
	origin: string;
	description?: string;
};

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

	const downloads = new Downloads({ eraseOnComplete: opts.closeTabsOnComplete });

	class Bookmarks {
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

		private _composeFilename(
			title: string,
			hostname: string,
			date?: string
		): string {
			const subdirOrPrefix = settings.bookmarksAlwaysToChildFolder.includes(hostname)
				? `${ hostname }/`
				: `[${ hostname }] `;

			const filename = (settings.bookmarksSaveLocation !== ""
				? settings.bookmarksSaveLocation + "/"
				: "")
				+ subdirOrPrefix
				+ sanitizeFilename(title).slice(0, 150)
				+ (date ? ` (${ date })` : "")
				+ ".url";

			return filename;
		}

		async saveSelectedTabs(): Promise<number[]> {
			const tabs = await Tabs.getCurrentTabHighlighted({ pinned: false });
			const processedTabs: number[] = [];

			for (const tab of tabs) {
				const { url, title } = tab;

				if (!url) continue;

				if (!/^http/.test(url)) {
					downloads.showNotification(
						NOTIFICATION_ID,
						makeNotificationOpts(`can't save: "${ url }"`)
					);
					continue;
				}

				const { hostname, origin } = new URL(url);
				const tabConnection = new TabConnection(tab.id);
				const urlFileBodyObjectURL = this._createObjectURL({
					url,
					origin,
					description: await tabConnection.querySelectorText([
						'meta[itemprop="description"]',
						'meta[name="twitter:description"]',
						'meta[property="twitter:description"]',
					].join(","))
				});

				const date = await tabConnection.querySelectorText('meta[itemprop="datePublished"]');  // yt: content="2020-04-01"

				if (!title) {
					throw new Error("no title");
				}

				const filename = this._composeFilename(title, hostname, date);

				if ((41 + filename.length) > 260) {
					console.error("filename.length", 41 + filename.length);
				}

				await downloads.start({
					conflictAction: "overwrite",
					url: urlFileBodyObjectURL,
					filename
				})
					.then(function () {
						if (tab.id) {
							processedTabs.push(tab.id);
						}

						downloads.showNotification(
							NOTIFICATION_ID,
							makeNotificationOpts(
								(opts.notifications ? String(opts.notifications.message) : "")
								+ `: ${ title }`
							)
						);
					})
					.catch(function (err: Error) {
						if (err instanceof Error) {
							downloads.showNotification(
								NOTIFICATION_ID,
								makeNotificationOpts(err.name + ": " + err.message)
							);
						}
						else {
							console.error(err);
						}
					});
			}

			return processedTabs;
		}
	}

	const bookmarks = new Bookmarks();

	async function saveBookmark(): Promise<void> {
		const tabIDs = await bookmarks.saveSelectedTabs();
		if (settings.bookmarksCloseOnComplete && tabIDs.length > 0) {
			await Tabs.close(tabIDs);
			await getActiveTabsInWin();
			await Tabs.closeEmptyWindow();
		}
	}

	browser.menus.create({
		id: "save-as-bookmark",
		title: "save current tab as bookmark file",
		enabled: true,
		contexts: ["browser_action"],
		onclick() {
			saveBookmark();
		},
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
