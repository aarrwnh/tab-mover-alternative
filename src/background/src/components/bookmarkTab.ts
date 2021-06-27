import { Downloads } from "../utils/Download";
import { TabUtils } from "../utils/Tab";

const BOOKMARK_NOTIFICATION_OPTS: browser.notifications.CreateNotificationOptions = {
	title: "Tab Mover Alternative",
	message: "Bookmark saved",
	type: "basic",
	iconUrl: "icons/bookmark.svg"
};

function makeNotificationOpts(message: string) {
	return { ...BOOKMARK_NOTIFICATION_OPTS, message };
}

const downloads = new Downloads();

class Bookmarks extends TabUtils {
	constructor(private subdirList: string[]) {
		super();
	}

	private _createURLFileBody({ url, origin }: {
		url: string;
		origin: string;
	}) {
		return [
			"[DEFAULT]",
			`BASEURL=${ origin }`,
			"[InternetShortcut]",
			`URL=${ url }`
		].join("\n");
	}

	private _createObjectURL(url: string, origin: string): string {
		const urlFileBodyRaw = this._createURLFileBody({ url, origin });
		const urlFileBodyBlob = new Blob([urlFileBodyRaw], { type: "text/plain" });
		return URL.createObjectURL(urlFileBodyBlob);
	}

	private _createFilename(title: string, hostname: string): string {
		const subdirOrPrefix = this.subdirList.includes(hostname)
			? `${ hostname }/`
			: `[${ hostname }] `;

		const filename = "bookmarks/"
			+ subdirOrPrefix
			+ title.slice(0, 230) + ".url";

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
			const urlFileBodyObjectURL = this._createObjectURL(url, origin);

			if (!title) {
				throw new Error("no title");
			}

			const filename = this._createFilename(title, hostname);

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
						makeNotificationOpts(BOOKMARK_NOTIFICATION_OPTS.message + `: ${ title }`)
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

export default function main(settings: Settings): void {

	const { bookmarkAlwaysToChildFolder } = settings;

	const bookmarks = new Bookmarks(bookmarkAlwaysToChildFolder);

	async function saveBookmark(): Promise<void> {
		const tabIDs = await bookmarks.saveSelectedTabs();
		if (tabIDs && tabIDs.length > 0) {
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
