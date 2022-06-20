import { createMenuItem } from "../../browser/Menu";
import { recentFocusedWindows } from "./recentFocusedWindows";
import { visitedTabsHistory } from "./visitedTabHistory";

const { WINDOW_ID_CURRENT, WINDOW_ID_NONE } = browser.windows;
const BADGE_COLOR_DEFAULT = "royalblue";
const BADGE_COLOR_LAST_FOCUS = "red";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "ftp:"]);

let windowMenuIds: (string | number)[] = [];
let lastMenuInstanceId = 0;
let nextMenuInstanceId = 1;

function cleanWindowTitle(title?: string): string {
	return (title || "").replace(/.{3}Firefox.+/, "");
}

export default async function main(settings: Addon.Settings) {
	/*
	* Copyright (C) 2018 Guido Berhoerster <guido+tab-mover@berhoerster.name>
	*
	* This Source Code Form is subject to the terms of the Mozilla Public
	* License, v. 2.0. If a copy of the MPL was not distributed with this
	* file, You can obtain one at http://mozilla.org/MPL/2.0/.
	*/

	function Logger(msg: string) {
		if (settings.debugMode) {
			console.log(msg);
		}
	}

	/** Move current (unpinned) tab to the end. */
	function moveTabToEnd() {
		getCurrentTab()
			.then((tabs) => {
				const currentTab = tabs[0];

				if (!currentTab) return;
				if (!currentTab.id) return;

				browser.tabs.move(currentTab.id, { index: -1 });

				Logger(`moving tab#${ currentTab.id } from index ${ currentTab.index } to #${ -1 }`);
			});
	}

	/** Move left/right over more tabs than ctrl+tab. */
	function navigateToTab(direction: 1 | -1) {
		const { tabTravelDistance } = settings;

		Logger(`tabTravelDistance: ${ tabTravelDistance }`);

		if (tabTravelDistance < 2) return;

		browser.tabs.query({
			windowId: WINDOW_ID_CURRENT,
			hidden: false
		})
			.then(function (tabs) {
				const currentTabIdx = tabs.findIndex((tab) => tab.active);
				const targetIdx = currentTabIdx + (direction * tabTravelDistance);
				const normalizeTargetIdx = Math.max(0, Math.min(targetIdx, tabs.length - 1));
				const id = tabs[normalizeTargetIdx].id;
				if (id) {
					browser.tabs.update(id, { active: true });
				}
			});
	}

	async function moveToWindow(targetWindowId: number, tabs: number[]) {
		if (targetWindowId < 1) {
			const newWindow = await browser.windows.create({ tabId: tabs.shift() });
			targetWindowId = newWindow.id || browser.windows.WINDOW_ID_NONE;
		}

		await browser.tabs.move(tabs, {
			windowId: targetWindowId,
			index: -1
		});
	}

	/**
	 * @param switchToActiveTab Force switch to tab, bypassing the global setting.
	 */
	async function moveTabs(
		tab: browser.tabs.Tab,
		targetWindowId: number,
		switchToActiveTab = false
	) {

		const { switchToTabAfterMoving, moveableContainers } = settings;

		// if the current tab is part of a highlighted group then move the whole
		// group
		const selectedTabs = tab.highlighted
			? await getHighlightedTabs(tab.windowId)
			: [tab];

		const activeTab = selectedTabs.find((tab) => tab.active);

		// NOTE:
		// code below added in original addon, version-9
		// https://hg.guido-berhoerster.org/addons/firefox-addons/tab-mover/rev/aaed574396b8
		// kind of don't see the point, why would I want to move pinned tabs?
		/*
		// unpin tabs before moving, this matches the built-in behavior
		let unpinningTabs = selectedTabs.flatMap((tab) =>
			tab.pinned ? [browser.tabs.update(tab.id, { pinned: false })] : []);
		await Promise.all(unpinningTabs.map((p) => p.catch((e) => e)));
		*/

		const filteredTabs = selectedTabs.reduce(function (obj, tab) {
			const { cookieStoreId, id } = tab;
			if (cookieStoreId) {
				if (!(cookieStoreId in obj)) {
					obj[cookieStoreId] = [];
				}
				obj[cookieStoreId].push(id || -1);
			}
			return obj;
		}, ({} as Record<string, number[]>));

		const cookieIDs = Object.keys(filteredTabs);
		const defaultTabIdx = cookieIDs.indexOf("firefox-default");

		if (cookieIDs.length > 1 && defaultTabIdx !== -1) {
			// when selected tabs are mixed,
			// handle just containered tabs first on first click
			delete filteredTabs["firefox-default"];
			cookieIDs.splice(defaultTabIdx, 1);
		}

		for (const cookieId of cookieIDs) {
			await moveToWindow(
				moveableContainers.includes(cookieId) ? 0 : targetWindowId,
				filteredTabs[cookieId]
			);
		}

		const actTabId = activeTab?.id ?? -1;

		if (switchToActiveTab
			|| switchToTabAfterMoving
			&& actTabId !== -1) {
			// mark the previously active tab active again before highlighting other
			// tabs since this resets the selected tabs

			await browser.tabs.update(actTabId, { active: true });

			for (const tab of selectedTabs) {
				if (tab.id !== actTabId) {
					await browser.tabs.update(tab.id ?? -1, { active: false, highlighted: true });
				}
			}
		}

		await unhighlightTabs(tab.id, tab.windowId);
	}

	/** Remove highlight when moving tabs filtered by cookie-id. */
	async function unhighlightTabs(currentTab?: number, windowId?: number) {
		if (!windowId) return;
		const tabs = await getHighlightedTabs(windowId);
		if (tabs.length < 2) return;
		tabs.forEach(function (tab) {
			if (!tab.id) return;
			if (tab.id === currentTab) return;
			browser.tabs.update(tab.id, { highlighted: false });
		});
	}

	async function reopenTabs(tab: browser.tabs.Tab, targetWindowId: number) {
		// if the current tab is part of a highlighted group then reopen the whole
		// group
		let selectedTabs = tab.highlighted
			? await getHighlightedTabs(tab.windowId)
			: [tab];

		// filter out privileged tabs which cannot be reopened
		selectedTabs = selectedTabs.filter(function (selectedTab) {
			return ALLOWED_PROTOCOLS.has(new URL(selectedTab.url || "").protocol);
		});

		if (selectedTabs.length === 0) {
			return;
		}

		let activeTab = selectedTabs.find((tab) => tab.active);

		// the actually active tab may have been filtered out above, fall back to
		// the first highlighted one
		if (typeof activeTab === "undefined") {
			activeTab = selectedTabs[0];
			activeTab.active = true;
		}

		const newTabs = await Promise.all(selectedTabs.map(function (selectedTab) {
			return browser.tabs.create({
				url: selectedTab.url,
				windowId: targetWindowId,
				active: selectedTab.active
			});
		}));

		// tabs can only be highlighted after they have been created
		for (const tab of newTabs) {
			if (!tab.active) {
				browser.tabs.update(tab.id || -1, { active: false, highlighted: true });
			}
		}

		browser.tabs.remove(selectedTabs.map((selectedTab) => selectedTab.id ?? -1));
	}

	async function onMenuShown(_info: browser.menus._OnShownInfo, tab: browser.tabs.Tab) {
		const menuInstanceId = nextMenuInstanceId++;
		lastMenuInstanceId = menuInstanceId;
		const creatingMenus: Promise<string | number>[] = [];
		const targetWindows = await getCurrentWindows();
		let moveMenuItems = 0;
		let reopenMenuItems = 0;
		for (const targetWindow of targetWindows) {
			const targetWindowId = targetWindow.id ?? -1;
			if (targetWindow.id === tab.windowId) {
				// ignore active window
				continue;
			}
			if (tab.incognito === targetWindow.incognito) {
				creatingMenus.push(createMenuItem({
					onclick(_info, tab) {
						moveTabs(tab, targetWindowId);
					},
					parentId: "move-menu",
					title: cleanWindowTitle(targetWindow.title)
				}));
				moveMenuItems++;
			}
			else {
				creatingMenus.push(createMenuItem({
					onclick(_info, tab) {
						reopenTabs(tab, targetWindowId);
					},
					parentId: "reopen-menu",
					title: cleanWindowTitle(targetWindow.title)
				}));
				reopenMenuItems++;
			}
		}
		const updatingMenus: Promise<void>[] = [
			browser.menus.update("move-menu", { enabled: moveMenuItems > 0 }),
			browser.menus.update("reopen-menu", { enabled: reopenMenuItems > 0 })
		];

		await Promise.all(creatingMenus);
		await Promise.all(updatingMenus);

		const newWindowMenuIds: (number | string)[] = await Promise.all(creatingMenus);
		if (menuInstanceId !== lastMenuInstanceId) {
			// menu has been closed and opened again, remove the items of this
			// instance again
			for (const menuId of newWindowMenuIds) {
				browser.menus.remove(menuId);
			}
			return;
		}
		windowMenuIds = newWindowMenuIds;
		browser.menus.refresh();
	}

	function onMenuHidden() {
		lastMenuInstanceId = 0;
		browser.menus.update("move-menu", { enabled: false });
		browser.menus.update("reopen-menu", { enabled: false });
		for (const menuId of windowMenuIds) {
			browser.menus.remove(menuId);
		}
	}

	async function setBadgeText(text: number | string) {
		await browser.browserAction.setBadgeText({ text: String(text) });
	}

	async function updateIconBadge(id: number) {
		const { showLastWindowIDBadge } = settings;
		const windows = await getCurrentWindows();

		if (typeof id === "undefined") {
			id = (await browser.windows.getLastFocused()).id || 0;
		}

		if (id > 0 && showLastWindowIDBadge) {
			setBadgeText(windows.length > 1 ? String(id) : "+");
		}

		if (windows.length === 1) {
			browser.browserAction.setTitle({ title: "" });
			browser.browserAction.setBadgeBackgroundColor({
				windowId: WINDOW_ID_CURRENT,
				color: BADGE_COLOR_DEFAULT
			});
			return;
		}

		const incognitoWindowsSize = recentFocusedWindows.sizeof(true);

		windows.forEach(function (y) {
			if (showLastWindowIDBadge) {
				browser.browserAction.setBadgeBackgroundColor({
					windowId: y.id,
					color: y.id === id
						? BADGE_COLOR_LAST_FOCUS
						: BADGE_COLOR_DEFAULT
				});
			}

			// Set the `non-active` icon for indicator of the last active window (destination)
			browser.browserAction.setIcon({
				windowId: y.id,
				path: `icons/web-browser-${ y.id === id ? "non-" : "" }active.svg`
			});

			if (y.incognito && incognitoWindowsSize === 1) {
				setBadgeText("");
				return;
			}

			if (y.id === id && y.title) {
				// Set button tooltip pointing current tab title of the last active window
				y.title = cleanWindowTitle(y.title);
				const title = y.title.slice(0, 20);
				const ellipsis = y.title.length === title.length ? "" : "...";

				browser.browserAction.setTitle({ title: `Move to window:\n${ id } : ${ title }${ ellipsis }` });
			}
		});
	}

	function openLastRecentTab(): void {
		const { recentTabTimeout } = settings;

		if (recentTabTimeout < 1) return;

		browser.tabs.query({ windowId: WINDOW_ID_CURRENT, hidden: false })
			.then((tabs) => {
				const now = new Date().getTime();

				const sorted = tabs
					.sort((a, b) => b.id && a.id ? b.id - a.id : 0)
					.filter((tab) =>
						!tab.active && (now - recentTabTimeout * 1000 - (tab.lastAccessed || 0)) < 0
					);

				if (sorted[0]) {
					browser.tabs.update(sorted[0].id ?? -1, { active: true });
				}
			});
	}

	function getCurrentTab(): Promise<browser.tabs.Tab[]> {
		return browser.tabs.query({ active: true, windowId: WINDOW_ID_CURRENT });
	}

	async function getCurrentWindows(): Promise<browser.windows.Window[]> {
		return await browser.windows.getAll({
			windowTypes: ["normal"],
		});
	}

	function getHighlightedTabs(windowId = WINDOW_ID_CURRENT): Promise<browser.tabs.Tab[]> {
		return browser.tabs.query({ highlighted: true, windowId });
	}

	function sortTabsByTitle<In extends browser.tabs.Tab>(a: In, b: In): number {
		if (!a.title || !b.title) return 0;
		const aTitle = a.title.toLowerCase();
		const bTitle = b.title.toLowerCase();
		if (aTitle < bTitle) return -1;
		if (aTitle > bTitle) return 1;
		return 0;
	}

	async function sortSelectedTabs() {
		const selectedTabs = await getHighlightedTabs();
		if (selectedTabs.length > 2) {
			const s = selectedTabs.sort(sortTabsByTitle).map((t) => t.id ?? -1);
			await browser.tabs.move(s, { index: selectedTabs[0].index });
		}
		else {
			await browser.notifications.create({
				title: "Tab Mover Alternative",
				message: "No tabs are selected to be sorted",
				type: "basic"
			});
		}
	}

	browser.menus.onShown.addListener(onMenuShown);
	browser.menus.onHidden.addListener(onMenuHidden);

	browser.tabs.onActivated.addListener(function (info) {
		visitedTabsHistory.add(info.tabId, info.windowId);
	});

	browser.tabs.onRemoved.addListener(function (removedTabId) {
		visitedTabsHistory.remove(removedTabId);
	});

	browser.commands.onCommand.addListener(function (command) {
		if (command === "goto-last-open-tab") {
			openLastRecentTab();
		}
		else if (command === "last-active-tab") {
			visitedTabsHistory.activateLatest();
		}
		else if (command === "sort-selected-tabs") {
			sortSelectedTabs();
		}
	});

	(await getCurrentWindows()).forEach((w) => recentFocusedWindows.set(w.id ?? -1));

	async function onClicked(
		tab: browser.tabs.Tab,
		info?: browser.browserAction.OnClickData
	): Promise<void> {
		if (!info) return;

		const { button, modifiers } = info;

		const targetWindows = await getCurrentWindows();

		const lastActiveWindow = recentFocusedWindows.recent(tab.incognito);

		if (targetWindows.length === 1) {
			moveTabs(tab, 0); // create new window
		}
		else {
			for (const targetWindow of targetWindows) {
				if (targetWindow.id === tab.windowId) {
					if (targetWindow.id && targetWindow.tabs && targetWindow.tabs.length === 1) {
						recentFocusedWindows.delete(targetWindow.id);
					}
					// ignore active window
					continue;
				}

				if (targetWindow.id) {
					moveTabs(
						tab,
						lastActiveWindow > 0 ? lastActiveWindow : targetWindow.id,
						modifiers.length > 0 && modifiers.includes("Shift")
							? true
							: button === 1
								? true
								: false
					);
				}
				break;
			}
		}
	}

	async function onFocusChanged(id: number): Promise<void> {
		if (id === WINDOW_ID_NONE) return;

		const win = await browser.windows.get(id);

		const lastFocusedWindowId = recentFocusedWindows.last(win.incognito);

		if (id > 0 && lastFocusedWindowId !== id) {
			updateIconBadge(lastFocusedWindowId);
			recentFocusedWindows.delete(id);
			recentFocusedWindows.set(id, win.incognito);
		}
	}

	function onRemoved(id: number): void {
		const isIncognito = recentFocusedWindows.get(id) || false;
		recentFocusedWindows.delete(id);
		updateIconBadge(recentFocusedWindows.recent(isIncognito));
	}

	browser.windows.onRemoved.addListener(onRemoved);
	browser.windows.onFocusChanged.addListener(onFocusChanged);

	browser.browserAction.onClicked.addListener(onClicked);
	browser.browserAction.setBadgeBackgroundColor({ color: BADGE_COLOR_DEFAULT });
	browser.browserAction.setBadgeTextColor({ color: "white" });

	browser.commands.onCommand.addListener(function (command) {
		switch (command) {
			case "move-tabs": {
				getCurrentTab().then((tab) => {
					const lastActiveWindow = recentFocusedWindows.recent();
					if (tab.length > 0 && lastActiveWindow > 0) {
						moveTabs(tab[0], lastActiveWindow);
					}
				});
				break;
			}
			case "tab-jump-right": {
				navigateToTab(1);
				break;
			}
			case "tab-jump-left": {
				navigateToTab(-1);
				break;
			}
			case "move-current-tab-last": {
				moveTabToEnd();
				break;
			}
		}
	});

	// update/reset some things on options change
	browser.storage.onChanged.addListener(function () {
		const { showLastWindowIDBadge } = settings;
		if (!showLastWindowIDBadge) {
			setBadgeText("");
		}
		if (showLastWindowIDBadge) {
			setBadgeText(recentFocusedWindows.first());
		}
	});

	if (recentFocusedWindows.size > 1) {
		updateIconBadge(recentFocusedWindows.recent());
	}
}
