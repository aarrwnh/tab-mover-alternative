import { setup } from "./src/settings";
import initTabMover from "./src/components/tabMover";
import initBookmarkTab from "./src/components/bookmarkTab";
import initImageSaver from "./src/components/imageSaver";

const internalSettings: {
	[key: string]: Addon.ModuleOpts;
} = {
	imageSaver: {
		folder: "baazacuda",
		closeTabsOnComplete: true,
		notifications: {
			title: "Tab image saver",
			type: "basic",
			iconUrl: "icons/image.svg",
		}
	},
	bookmarks: {
		folder: "bookmarks",
		closeTabsOnComplete: true,
		notifications: {
			title: "Tab Mover Alternative",
			message: "Bookmark saved",
			type: "basic",
			iconUrl: "icons/bookmark.svg"
		}
	}
};

async function main() {
	const settings = await setup();

	settings.imageSaverRules = [
		{
			name: "twitter",
			target: "^https?://pbs.twimg.com/media/[^/]+#user=([^>#]+)",
			folder: "pic\\twitter\\$1;"
		},
		{
			// http://cloud2.akibablog.net/2021/may/31/wh33/250.jpg
			name: "akibablog",
			target: "^http://cloud[0-9].akibablog.net/([0-9]+)/([\\w\\d-]+)/([0-9]+)/([\\w\\d]+)",
			folder: "pic\\akibablog\\$1;-$2;-$3;__$4;"
		},
		{
			// http://www.daikikougyou.com/2021item/fuukiiin_san/fuukiiin_000.jpg
			name: "http://www.daikikougyou.com/",
			target: "^http://www.daikikougyou.com/([0-9]+)item/([\\d\\w_]+)/",
			folder: "pic\\daikikougyou\\$1;_$2;"
		},
		{
			// https://ogre.natalie.mu/media/news/comic/2021/0521/saekano_katoumegumi_racequeen_figure_1.jpg
			name: "https://ogre.natalie.mu",
			target: "^https://(?:\\w+).natalie.mu/media/news/(\\w+)/([0-9]+)/([0-9]+)/",
			folder: "pic\\natalie.mu\\$1;\\$2;\\$3;"
		}
	];

	initTabMover(settings);
	initBookmarkTab(settings, internalSettings.bookmarks);
	initImageSaver(settings, internalSettings.imageSaver);
}

main();