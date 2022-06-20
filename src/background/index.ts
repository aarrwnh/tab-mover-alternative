import { setupSettings } from "./src/settings";
import setupTabMover from "./src/components/tabMover";
import setupBookmarkTab from "./src/components/bookmarkTab";
import setupImageSaver from "./src/components/imageSaver";
import { createMenuItem } from "./src/browser/Menu";

// const badgeCtl = new class BadgeCtl {
//    private _locked = false;
//    private _prevText = "";
//    private _lockKey = 0;

//    public async lock(key: number): Promise<void> {
//       this._locked = true;
//       this._lockKey = key;
//       this._prevText = await browser.browserAction.getBadgeText({});
//    }

//    public unlock(key: number): void {
//       if (key !== this._lockKey) return;
//       this.set(key, this._prevText);
//       this._locked = false;
//       this._lockKey = 0;
//    }

//    set(key: number, text: string): void {
//       if (key !== this._lockKey || this._locked) return;

//       browser.browserAction.setBadgeText({ text });
//    }
// };

// const key = Date.now();
// badgeCtl.lock(key);
// badgeCtl.set(key, "asd");
// badgeCtl.unlock(key);

async function main() {
	const settings = await setupSettings();

	await Promise.all([
		// create submenus
		createMenuItem({
			id: "move-menu",
			title: browser.i18n.getMessage("moveToWindowMenu"),
			enabled: false,
			contexts: ["tab"]
		}),
		createMenuItem({
			id: "reopen-menu",
			title: browser.i18n.getMessage("reopenInWindowMenu"),
			enabled: false,
			contexts: ["tab"]
		})
	]);

	setupTabMover(settings);

	setupBookmarkTab(settings, {
		notifications: {
			title: "Tab Mover Alternative",
			message: "Bookmark saved",
			type: "basic",
			iconUrl: "icons/bookmark.svg"
		}
	});

	setupImageSaver(settings, {
		notifications: {
			title: "Tab image saver",
			type: "basic",
			iconUrl: "icons/image.svg",
		}
	});
}

main();
