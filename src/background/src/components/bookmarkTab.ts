import { Download } from "../utils/Download";
import { TabUtils } from "../utils/Tab";

const BOOKMARK_NOTIFICATION_OPTS: Partial<browser.notifications.CreateNotificationOptions> = {
	title: "Tab Mover Alternative",
	message: "Bookmark saved",
	type: "basic",
	iconUrl: "icons/web-browser-active.svg"
};

class Bookmark extends TabUtils {
	constructor() {
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

	async save() {
		const tabs = await this.getCurrentTabInWindow();
		const currentTab = tabs[0];

		if (!currentTab.highlighted)
			return;

		const { url, title } = currentTab;

		if (!url) return;

		if (!/^http/.test(url)) return;

		const objectURL = new URL(url);
		const { hostname, origin } = objectURL;

		const urlFileBodyRaw = this._createURLFileBody({ url, origin });
		const urlFileBodyBlob = new Blob([urlFileBodyRaw], { type: "text/plain" });
		const urlFileBodyObjectURL = URL.createObjectURL(urlFileBodyBlob);

		BOOKMARK_NOTIFICATION_OPTS.message += `: ${ title }`;

		const download = new Download(
			{ removeAfterComplete: true },
			{ notifications: BOOKMARK_NOTIFICATION_OPTS }
		);

		if (!title) {
			throw new Error("no title");
		}

		download.start({
			conflictAction: "overwrite",
			url: urlFileBodyObjectURL,
			filename: "bookmarks/"
				+ `[${ hostname }] `
				+ download.normalizeFilename(title).slice(0, 230) + ".url"
		});

	}
}

function saveBookmark(): void {
	const bookmark = new Bookmark();
	bookmark.save();
}

export default function main(): void {
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
