const { WINDOW_ID_CURRENT, WINDOW_ID_NONE } = browser.windows;
const BADGE_COLOR_DEFAULT = "royalblue";
const BADGE_COLOR_LAST_FOCUS = "red";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "ftp:"]);

let windowMenuIds: (string | number)[] = [];
let lastMenuInstanceId = 0;
let nextMenuInstanceId = 1;

export default function main(settings: Settings) {
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

		if (tabTravelDistance < 2) return;

		browser.tabs.query({
			windowId: WINDOW_ID_CURRENT,
			hidden: false
		})
			.then((tabs) => {
				const currentTabIdx = tabs.findIndex((tab) => tab.active);
				const targetIdx = currentTabIdx + (direction * tabTravelDistance);
				const normalizeTargetIdx = Math.max(0, Math.min(targetIdx, tabs.length - 1));
				const id = tabs[normalizeTargetIdx].id;
				if (id) {
					browser.tabs.update(id, { active: true });
				}
			});
	}

	function createMenuItem(createProperties: browser.menus._CreateCreateProperties): Promise<string | number> {
		return new Promise((resolve, reject) => {
			const id = browser.menus.create(createProperties, () => {
				if (browser.runtime.lastError) {
					reject(browser.runtime.lastError);
				}
				else {
					resolve(id);
				}
			});
		});
	}

	async function moveToWindow(targetWindowId: number, tabs: number[]) {
		if (targetWindowId < 1) {
			const newWindow = await browser.windows.create({ tabId: tabs.pop() });
			targetWindowId = newWindow.id || browser.windows.WINDOW_ID_NONE;
		}

		await browser.tabs.move(tabs, {
			windowId: targetWindowId,
			index: -1
		});
	}

	/**
	 * @param switchToActiveTab Force switch to tab bypassing the global setting.
	 */
	async function moveTabs(
		tab: browser.tabs.Tab,
		targetWindowId: number,
		switchToActiveTab = false
	) {

		const { switchToTabAfterMoving, moveableContainers } = settings;

		// if the current tab is part of a highlighted group then move the whole
		// group
		const selectedTabs = (tab.highlighted)
			? await browser.tabs.query({
				highlighted: true,
				windowId: tab.windowId
			})
			: [tab];

		const activeTab = selectedTabs.find((tab) => tab.active);

		// NOTE:
		// added in original addon, version-9 https://hg.guido-berhoerster.org/addons/firefox-addons/tab-mover/rev/aaed574396b8
		// kind of don't see the point
		// unpin tabs before moving, this matches the built-in behavior
		// let unpinningTabs = selectedTabs.flatMap((tab) =>
		// 	tab.pinned ? [browser.tabs.update(tab.id, { pinned: false })] : []);
		// await Promise.all(unpinningTabs.map((p) => p.catch((e) => e)));

		const filteredTabs = selectedTabs.reduce(function (o, tab) {
			if (tab.cookieStoreId) {
				if (!(tab.cookieStoreId in o)) {
					o[tab.cookieStoreId] = [];
				}
				o[tab.cookieStoreId].push(tab.id || -1);
			}
			return o;
		}, ({} as { [key: string]: number[] }));

		const cookieIDs = Object.keys(filteredTabs);
		const defaultTabIdx = cookieIDs.indexOf("firefox-default");

		if (cookieIDs.length > 1 && defaultTabIdx !== -1) {
			// when selected tabs are mixed,
			// handle just containered tabs first on first click
			// @ts-ignore
			delete filteredTabs["firefox-default"];
			cookieIDs.splice(defaultTabIdx, 1);
		}

		for (const cookieId of cookieIDs) {
			moveToWindow(
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

			await browser.tabs.update(actTabId ?? -1, { active: true });

			for (const tab of selectedTabs) {
				if (tab.id !== actTabId) {
					browser.tabs.update(tab.id ?? -1, { active: false, highlighted: true });
				}
			}
		}
	}

	async function reopenTabs(tab: browser.tabs.Tab, targetWindowId: number) {
		// if the current tab is part of a highlighted group then reopen the whole
		// group
		let selectedTabs = (tab.highlighted) ? await browser.tabs.query({
			highlighted: true,
			windowId: tab.windowId
		}) : [tab];

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

	async function onMenuShown(info: browser.menus._OnShownInfo, tab: browser.tabs.Tab) {
		const menuInstanceId = nextMenuInstanceId++;
		lastMenuInstanceId = menuInstanceId;
		const targetWindows = await browser.windows.getAll({
			populate: true,
			windowTypes: ["normal"]
		});
		const creatingMenus: Promise<string | number>[] = [];
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
					onclick: (info, tab) => moveTabs(tab, targetWindowId),
					parentId: "move-menu",
					title: targetWindow.title
				}));
				moveMenuItems++;
			}
			else {
				creatingMenus.push(createMenuItem({
					onclick: (info, tab) => reopenTabs(tab, targetWindowId),
					parentId: "reopen-menu",
					title: targetWindow.title
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

	async function onMenuHidden() {
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

		const windows = await browser.windows.getAll();

		const { showLastWindowIDBadge } = settings;

		if (showLastWindowIDBadge) {
			setBadgeText(windows.length > 1 ? String(id) : "+");
		}

		if (windows.length === 1) {
			browser.browserAction.setTitle({ title: "" });
		}

		windows.forEach((y) => {
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

			if (y.id === id && y.title) {
				// Set button tooltip pointing current tab title of the last active window
				y.title = y.title.replace(" — Firefox Nightly", "");
				const title = y.title.slice(0, 20);
				const ellipsis = y.title.length === title.length ? "" : "...";

				browser.browserAction.setTitle({ title: `Move to window:\n${ id } : ${ title }${ ellipsis }` });
			}
		});
	}

	(async () => {
		await Promise.all([
			// create submenus
			createMenuItem({
				id: "move-menu",
				title: browser.i18n.getMessage("extensionName"),
				enabled: false,
				contexts: ["tab"]
			}),
			// createMenuItem({
			// 	id: "reopen-menu",
			// 	title: browser.i18n.getMessage("reopenInWindowMenu"),
			// 	enabled: false,
			// 	contexts: ["tab"]
			// })
		]);
		browser.menus.onShown.addListener(onMenuShown);
		browser.menus.onHidden.addListener(onMenuHidden);
	})();

	async function openLastRecentTab(): Promise<void> {
		const { recentTabTimeout } = settings;

		if (recentTabTimeout < 1) return;

		return browser.tabs.query({ windowId: WINDOW_ID_CURRENT, hidden: false })
			.then((tabs) => {
				const now = new Date().getTime();

				const sorted = tabs
					.sort((a, b) => {
						return b.id && a.id ? b.id - a.id : 0;
					})
					.filter((tab) => {
						return !tab.active && (now - recentTabTimeout * 1000 - (tab.lastAccessed || 0)) < 0;
					});

				if (sorted[0]) {
					browser.tabs.update(sorted[0].id ?? -1, { active: true });
				}
			});
	}

	function getCurrentWindow(): Promise<browser.windows.Window> {
		return browser.windows.getCurrent();
	}

	function getCurrentTab(): Promise<browser.tabs.Tab[]> {
		return browser.tabs.query({ active: true, windowId: WINDOW_ID_CURRENT });
	}

	function sortSelectedTabs() {
		browser.tabs.query({
			windowId: WINDOW_ID_CURRENT,
			highlighted: true
		})
			.then((selectedTabs) => {
				if (selectedTabs.length > 2) {
					selectedTabs.sort((a, b) => {
						if (!a.title || !b.title) return 0;
						const aTitle = a.title.toLowerCase();
						const bTitle = b.title.toLowerCase();
						if (aTitle < bTitle) return -1;
						if (aTitle > bTitle) return 1;
						return 0;
					});
					browser.tabs.move(selectedTabs.map((t) => t.id ?? -1), { index: selectedTabs[0].index });
				}
			});
	}

	(() => {
		const prevFocusedTabs: Map<number, browser.tabs._OnActivatedActiveInfo> = new Map();

		browser.tabs.onActivated.addListener((info) => {
			// prevent update on tab removal
			if (info.previousTabId === undefined) return;
			prevFocusedTabs.set(info.windowId, info);
		});

		function switchToPrevTabInWindow(info: browser.tabs._OnActivatedActiveInfo) {
			browser.tabs.query({ windowId: info.windowId })
				.then((tabs) => {
					const prevActiveTab = tabs.filter((tab) => tab.id === info.previousTabId);
					if (prevActiveTab.length === 1) {
						browser.tabs.update(prevActiveTab[0].id ?? -1, { active: true });
					}
				});
		}

		browser.commands.onCommand.addListener((command) => {
			if (command === "goto-last-open-tab") {
				openLastRecentTab();
			}
			else if (command === "last-active-tab") {
				getCurrentWindow().then((currentWindow) => {
					const id = currentWindow.id;
					if (id && prevFocusedTabs.has(id)) {
						const activeInfo = prevFocusedTabs.get(id);
						if (activeInfo) {
							switchToPrevTabInWindow(activeInfo);
						}
					}
				});
			}
			else if (command === "sort-selected-tabs") {
				sortSelectedTabs();
			}
		});
	})();

	(async () => {

		const lastFocusedWindow: Set<number> = new Set();
		(await browser.windows.getAll()).forEach((w) => lastFocusedWindow.add(w.id ?? -1));

		async function onClicked(
			tab: browser.tabs.Tab,
			info?: browser.browserAction.OnClickData
		): Promise<void> {

			if (!info) return;

			const { button, modifiers } = info;

			const targetWindows = await browser.windows.getAll({
				populate: true,
				windowTypes: ["normal"]
			});

			const lastActiveWindow = [...lastFocusedWindow].reverse()[1];

			if (targetWindows.length === 1) {
				moveTabs(tab, 0); // create new window
			}
			else {
				for (const targetWindow of targetWindows) {
					if (targetWindow.id === tab.windowId) {
						if (targetWindow.id && targetWindow.tabs && targetWindow.tabs.length === 1) {
							lastFocusedWindow.delete(targetWindow.id);
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

		function onFocusChanged(id: number) {
			if (id === WINDOW_ID_NONE) return;

			browser.windows.get(id)
				.then((window) => {
					if (window.type !== "normal") return;

					if (id > 0) {
						const last = [...lastFocusedWindow][lastFocusedWindow.size - 1];
						if (last !== id) {
							updateIconBadge(last);
							lastFocusedWindow.delete(id);
							lastFocusedWindow.add(id);
						}
					}
				})
				.catch(console.error);
		}

		function onRemoved(id: number) {
			updateIconBadge([...lastFocusedWindow][0]);
			lastFocusedWindow.delete(id);
		}

		browser.windows.onRemoved.addListener(onRemoved);
		browser.windows.onFocusChanged.addListener(onFocusChanged);

		browser.browserAction.onClicked.addListener(onClicked);
		browser.browserAction.setBadgeBackgroundColor({ color: BADGE_COLOR_DEFAULT });
		browser.browserAction.setBadgeTextColor({ color: "white" });

		browser.commands.onCommand.addListener((command) => {
			switch (command) {
				case "move-tabs": {
					getCurrentTab().then((tab) => {
						const lastActiveWindow = [...lastFocusedWindow].reverse()[1];
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

		if (lastFocusedWindow.size > 1) {
			updateIconBadge([...lastFocusedWindow][1]);
		}

		// update/reset some things on options change
		browser.storage.onChanged.addListener(async () => {
			const { showLastWindowIDBadge } = settings;
			if (!showLastWindowIDBadge) {
				setBadgeText("");
			}
			if (showLastWindowIDBadge) {
				setBadgeText([...lastFocusedWindow][0]);
			}
		});

	})();
}
