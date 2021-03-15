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

const opts = {
    switchToTabAfterMoving: false,
    showLastWindowIDBadge: false
};

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

async function moveTabs(tab, targetWindowId, switchToActiveTab = false) {
    updateOptions();

    // if the current tab is part of a highlighted group then move the whole
    // group
    let selectedTabs = (tab.highlighted)
        ? await browser.tabs.query({
            highlighted: true,
            windowId: tab.windowId
        })
        : [tab];

    let activeTab = selectedTabs.find((tab) => tab.active);

    if (!targetWindowId) {
        const newWindow = await browser.windows.create({
            tabId: selectedTabs.pop().id
        });
        targetWindowId = newWindow.id;
    }

    await browser.tabs.move(
        selectedTabs.map((selectedTab) => selectedTab.id),
        {
            windowId: targetWindowId,
            index: -1
        }
    );

    if (switchToActiveTab
        || opts.switchToTabAfterMoving && activeTab && activeTab.id) {
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

async function updateOptions() {
    browser.storage.local.get()
        .then((item) => {
            for (const [key, val] of Object.entries(item)) {
                if (key in opts) {
                    opts[key] = val;
                }
            }
        });
}

async function updateIconBadge(id) {
    const windows = await browser.windows.getAll();

    if (opts.showLastWindowIDBadge) {
        await browser.browserAction.setBadgeText({
            text: windows.length > 1 ? String(id) : ""
        });
    }
    windows.forEach((y) => {
        if (opts.showLastWindowIDBadge) {
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

(async () => {

    let lastFocused = new Set();
    (await browser.windows.getAll()).forEach((w) => lastFocused.add(w.id));

    /**
     * @param {browser.tabs.Tab | undefined} tab 
     * @param {browser.contextMenus.OnClickData} info 
     */
    const onClicked = async (tab, info) => {
        const { button, modifiers } = info;
        const switchToActiveTab = modifiers.length > 0 && modifiers.includes("Shift")
            ? true
            : button === 1
                ? true
                : false;

        let targetWindows = await browser.windows.getAll({
            populate: true,
            windowTypes: ["normal"]
        });

        const lastActiveWindow = [...lastFocused].reverse()[1];

        if (targetWindows.length === 1) {
            moveTabs(tab, null);
        }
        else {
            for (let targetWindow of targetWindows) {
                if (targetWindow.id === tab.windowId) {
                    if (targetWindow.tabs.length === 1) {
                        lastFocused.delete(targetWindow.id);
                    }
                    // ignore active window
                    continue;
                }

                moveTabs(
                    tab,
                    lastActiveWindow > 0 ? lastActiveWindow : targetWindow.id,
                    switchToActiveTab
                );
                break;
            }
        }
    };

    browser.windows.onFocusChanged.addListener(async (id) => {
        if (id > 0) {
            const last = [...lastFocused][lastFocused.size - 1];
            if (last !== id) {
                updateIconBadge(last);
                lastFocused.delete(id);
                lastFocused.add(id);
            }
        }

    });

    browser.windows.onRemoved.addListener((id) => {
        lastFocused.delete(id);
        updateIconBadge([...lastFocused][0]);
    });

    browser.browserAction.onClicked.addListener(onClicked);
    // browser.contextMenus.onClicked.addListener(onClicked);

    browser.browserAction.setBadgeBackgroundColor({ color: BADGE_COLOR_DEFAULT });
    browser.browserAction.setBadgeTextColor({ color: "white" });

    if (lastFocused.size > 1) {
        updateIconBadge([...lastFocused][1]);
    }
})();
