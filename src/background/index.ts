import { setup } from "./src/settings";
import initTabMover from "./src/components/tabMover";
import initBookmarkTab from "./src/components/bookmarkTab";
import initImageSaver from "./src/components/imageSaver";
import { createMenuItem } from "./src/browser/Menu";

async function main() {
	const settings = await setup();

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

	initTabMover(settings);

	initBookmarkTab(settings, {
		notifications: {
			title: "Tab Mover Alternative",
			message: "Bookmark saved",
			type: "basic",
			iconUrl: "icons/bookmark.svg"
		}
	});

	initImageSaver(settings, {
		notifications: {
			title: "Tab image saver",
			type: "basic",
			iconUrl: "icons/image.svg",
		}
	});
}

main();
