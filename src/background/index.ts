import { setup } from "./src/settings";
import initTabMover from "./src/components/tabMover";
import initBookmarkTab from "./src/components/bookmarkTab";
import initImageSaver from "./src/components/imageSaver";

async function main() {
	const settings = await setup();

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