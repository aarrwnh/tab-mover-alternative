import { setupSettings } from "./src/settings";
import setupTabMover from "./src/components/tabMover/";
import setupBookmarkTab from "./src/components/bookmarkTab";
import setupImageSaver from "./src/components/imageSaver";
import setupReloadTabs from "./src/components/reloadTabs";
import { createMenuItem } from "./src/browser/Menu";

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
	setupReloadTabs(settings);

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
