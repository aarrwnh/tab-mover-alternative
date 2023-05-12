import { Queue } from "../utils/Queue";

export default function main(_settings: Addon.Settings): void {
	const queue = new Queue(2);

	async function reloadTabs() {
		const tabs = await browser.tabs.query({
			windowId: browser.windows.WINDOW_ID_CURRENT,
			highlighted: true,
			pinned: false,
			hidden: false,
			active: false,
			// discarded: true,
		});

		for (const tab of tabs) {
			browser.tabs.update(tab.id!, { highlighted: false });

			queue.exec(async function () {
				await new Promise(function (resolve) {
					function response(details: browser.webNavigation._OnCompletedDetails) {
						if (details.url.startsWith("about:")) {
							return;
						}
						if (details.tabId !== tab.id) {
							return;
						}
						resolve(undefined);
						browser.webNavigation.onCompleted.removeListener(response);
					}
					browser.tabs.reload(tab.id!, {
						bypassCache: true
					});
					browser.webNavigation.onCompleted.addListener(response);
				});
			});
		}
	}

	browser.commands.onCommand.addListener(function (command) {
		if (command === "reload-tabs") {
			reloadTabs();
		}
	});

	browser.menus.create({
		id: "reload-tabs",
		title: "Reload Selected Tabs",
		enabled: true,
		contexts: ["browser_action"],
		onclick() {
			reloadTabs();
		},
		icons: { 32: "icons/reload.svg" }
	});
}
