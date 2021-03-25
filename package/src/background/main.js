/* globals settings */

/*
 * Copyright (C) 2018 Guido Berhoerster <guido+tab-mover@berhoerster.name>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const BADGE_COLOR_DEFAULT = "royalblue";
const BADGE_COLOR_LAST_FOCUS = "red";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "ftp:"]);
var windowMenuIds = [];
var lastMenuInstanceId = 0;
var nextMenuInstanceId = 1;

function log(msg) {
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

			browser.tabs.move(currentTab.id, { index: -1 });

			log(`moving tab#${ currentTab.id } from index ${ currentTab.index } to #${ -1 }`);
		});
}

/**
 * Move left/right over more tabs than ctrl+tab.
 * @param {1 | -1} direction 
 */
function navigateToTab(direction) {
	const { tabTravelDistance } = settings;

	if (tabTravelDistance < 2) return;

	getCurrentTab().then((currentTab) => {
		if (currentTab.length !== 1) return;

		const index = currentTab[0].index;
		const jumpToIndex = direction === 1
			? index + tabTravelDistance
			: direction === -1
				? index - tabTravelDistance
				: -1;

		if (jumpToIndex < 0) return;

		browser.tabs.query({
			windowId: browser.windows.WINDOW_ID_CURRENT,
			index: jumpToIndex
		})
			.then((targetTab) => {
				if (targetTab.length !== 1) return;

				browser.tabs.update(targetTab[0].id, { active: true });
			});
	});
}

function createMenuItem(createProperties) {
	return new Promise((resolve, reject) => {
		let id = browser.menus.create(createProperties, () => {
			if (browser.runtime.lastError) {
				reject(browser.runtime.lastError);
			} else {
				resolve(id);
			}
		});
	});
}

/**
 * @param {number} targetWindowId 
 * @param {number[]} tabs 
 */
async function moveToWindow(targetWindowId, tabs) {
	if (targetWindowId < 1) {
		const newWindow = await browser.windows.create({
			tabId: tabs.pop()
		});
		targetWindowId = newWindow.id;
	}

	await browser.tabs.move(tabs, {
		windowId: targetWindowId,
		index: -1
	});
}

/**
 * @param {browser.tabs.Tab} tab 
 * @param {number} targetWindowId 
 * @param {boolean} switchToActiveTab Force switch to tab bypassing the global setting.
 */
async function moveTabs(tab, targetWindowId, switchToActiveTab = false) {

	const { switchToTabAfterMoving, moveableContainers } = settings;

	// if the current tab is part of a highlighted group then move the whole
	// group
	let selectedTabs = (tab.highlighted)
		? await browser.tabs.query({
			highlighted: true,
			windowId: tab.windowId
		})
		: [tab];

	let activeTab = selectedTabs.find((tab) => tab.active);

	const filteredTabs = selectedTabs.reduce((o, tab) => {
		if (!(tab.cookieStoreId in o)) {
			o[tab.cookieStoreId] = [];
		}
		return o[tab.cookieStoreId].push(tab.id), o;
	}, {});

	const cookieIDs = Object.keys(filteredTabs);
	const defaultTabIdx = cookieIDs.indexOf("firefox-default");

	if (cookieIDs.length > 1 && defaultTabIdx !== -1) {
		// when selected tabs are mixed,
		// handle just containered tabs first on first click
		delete filteredTabs["firefox-default"];
		cookieIDs.splice(defaultTabIdx, 1);
	}

	for (const cookieId of cookieIDs) {
		moveToWindow(
			moveableContainers.includes(cookieId) ? 0 : targetWindowId,
			filteredTabs[cookieId]
		);
	}

	if (switchToActiveTab
		|| switchToTabAfterMoving
		&& activeTab
		&& activeTab.id) {
		// mark the previously active tab active again before highlighting other
		// tabs since this resets the selected tabs
		await browser.tabs.update(activeTab.id, { active: true });
		for (let tab of selectedTabs) {
			if (tab.id !== activeTab.id) {
				browser.tabs.update(tab.id, { active: false, highlighted: true });
			}
		}
	}
}

async function reopenTabs(tab, targetWindowId) {
	// if the current tab is part of a highlighted group then reopen the whole
	// group
	let selectedTabs = (tab.highlighted) ? await browser.tabs.query({
		highlighted: true,
		windowId: tab.windowId
	}) : [tab];
	// filter out privileged tabs which cannot be reopened
	selectedTabs = selectedTabs.filter((selectedTab) =>
		ALLOWED_PROTOCOLS.has(new URL(selectedTab.url).protocol));
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
	let newTabs = await Promise.all(selectedTabs.map((selectedTab) => {
		return browser.tabs.create({
			url: selectedTab.url,
			windowId: targetWindowId,
			active: selectedTab.active
		});
	}));

	// tabs can only be highlighted after they have been created
	for (let tab of newTabs) {
		if (!tab.active) {
			browser.tabs.update(tab.id, { active: false, highlighted: true });
		}
	}
	browser.tabs.remove(selectedTabs.map((selectedTab) => selectedTab.id));
}

async function onMenuShown(info, tab) {
	let menuInstanceId = nextMenuInstanceId++;
	lastMenuInstanceId = menuInstanceId;
	let targetWindows = await browser.windows.getAll({
		populate: true,
		windowTypes: ["normal"]
	});
	let creatingMenus = [];
	let moveMenuItems = 0;
	let reopenMenuItems = 0;
	for (let targetWindow of targetWindows) {
		if (targetWindow.id === tab.windowId) {
			// ignore active window
			continue;
		}
		if (tab.incognito === targetWindow.incognito) {
			creatingMenus.push(createMenuItem({
				onclick: (info, tab) => moveTabs(tab, targetWindow.id),
				parentId: "move-menu",
				title: targetWindow.title
			}));
			moveMenuItems++;
		} else {
			creatingMenus.push(createMenuItem({
				onclick: (info, tab) => reopenTabs(tab, targetWindow.id),
				parentId: "reopen-menu",
				title: targetWindow.title
			}));
			reopenMenuItems++;
		}
	}
	let updatingMenus = [
		browser.menus.update("move-menu", { enabled: moveMenuItems > 0 }),
		browser.menus.update("reopen-menu", { enabled: reopenMenuItems > 0 })
	];
	await Promise.all([...creatingMenus, ...updatingMenus]);
	let newWindowMenuIds = await Promise.all(creatingMenus);
	if (menuInstanceId !== lastMenuInstanceId) {
		// menu has been closed and opened again, remove the items of this
		// instance again
		for (let menuId of newWindowMenuIds) {
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
	for (let menuId of windowMenuIds) {
		browser.menus.remove(menuId);
	}
}

async function setBadgeText(text) {
	await browser.browserAction.setBadgeText({ text: String(text) });
}

async function updateIconBadge(id) {
	if (id < 0) return;

	const windows = await browser.windows.getAll();

	const { showLastWindowIDBadge } = settings;

	if (showLastWindowIDBadge) {
		setBadgeText(windows.length > 1 ? String(id) : "+");
	}

	if (windows.length === 1) {
		browser.browserAction.setTitle({
			title: ""
		});
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
			path: `src/icons/web-browser-${ y.id === id ? "non-" : "" }active.svg`
		});

		if (y.id === id) {
			// Set button tooltip pointing current tab title of the last active window
			y.title = y.title.replace(" — Firefox Nightly", "");
			const title = y.title.slice(0, 20);
			const ellipsis = y.title.length === title.length ? "" : "...";

			browser.browserAction.setTitle({
				title: `Move to window:\n${ id } : ${ title }${ ellipsis }`
			});
		}
	});
}

(async () => {
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
	browser.menus.onShown.addListener(onMenuShown);
	browser.menus.onHidden.addListener(onMenuHidden);
})();

/**
 * @returns {Promise<browser.windows.Window>}
 */
function getCurrentWindow() {
	return browser.windows.getCurrent();
}

/**
 * @returns {Promise<browser.tabs.Tab[]>}
 */
function getCurrentTab() {
	return browser.tabs.query({
		active: true,
		windowId: browser.windows.WINDOW_ID_CURRENT
	});
}

(() => {
	/**
	 * @type {Map<number, browser.tabs._OnActivatedActiveInfo>}
	 */
	const prevFocusedTabs = new Map();

	browser.tabs.onActivated.addListener((info) => {
		// prevent update on tab removal
		if (info.previousTabId === undefined) return;
		prevFocusedTabs.set(info.windowId, info);
	});

	/**
	 * @param {browser.tabs._OnActivatedActiveInfo} info 
	 */
	function switchToPrevTabInWindow(info) {
		browser.tabs.query({ windowId: info.windowId })
			.then((tabs) => {
				const prevActiveTab = tabs.filter((tab) => tab.id === info.previousTabId);
				if (prevActiveTab.length === 1) {
					browser.tabs.update(prevActiveTab[0].id, { active: true });
				}
			});
	}

	browser.commands.onCommand.addListener((command) => {
		if (command === "last-active-tab") {
			getCurrentWindow().then((currentWindow) => {
				const id = currentWindow.id;
				if (prevFocusedTabs.has(id)) {
					switchToPrevTabInWindow(prevFocusedTabs.get(id));
				}
			});
		}
	});

})();

(async () => {

	let lastFocusedWindow = new Set();
	(await browser.windows.getAll()).forEach((w) => lastFocusedWindow.add(w.id));

	/**
	 * @param {browser.tabs.Tab | undefined} tab 
	 * @param {browser.contextMenus.OnClickData} info 
	 */
	async function onClicked(tab, info) {
		const { button, modifiers } = info;

		let targetWindows = await browser.windows.getAll({
			populate: true,
			windowTypes: ["normal"]
		});

		const lastActiveWindow = [...lastFocusedWindow].reverse()[1];

		if (targetWindows.length === 1) {
			moveTabs(tab, null); // create new window
		}
		else {
			for (let targetWindow of targetWindows) {
				if (targetWindow.id === tab.windowId) {
					if (targetWindow.tabs.length === 1) {
						lastFocusedWindow.delete(targetWindow.id);
					}
					// ignore active window
					continue;
				}

				moveTabs(
					tab,
					lastActiveWindow > 0 ? lastActiveWindow : targetWindow.id,
					modifiers.length > 0 && modifiers.includes("Shift")
						? true
						: button === 1
							? true
							: false
				);
				break;
			}
		}
	}

	function onFocusChanged(id) {
		if (id === browser.windows.WINDOW_ID_NONE) return;

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

	function onRemoved(id) {
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
