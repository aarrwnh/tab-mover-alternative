const { WINDOW_ID_CURRENT } = browser.windows;

export async function closeWindowIfEmpty(tabs: browser.tabs.Tab[]): Promise<void> {
	const windows = await browser.windows.getAll();
	// close window only if the only tab left is a "New Tab"
	// created automatically after saving all images
	if (windows.length > 1
		&& tabs.length === 1
		&& tabs[0].index === 0
		&& tabs[0].title === "New Tab"
		&& tabs[0].windowId
	) {
		await browser.windows.remove(tabs[0].windowId);
	}
}

/** Get all opened tabs prioritizing highlighted ones. */
export async function getActiveTabsInWin(
	windowId = browser.windows.WINDOW_ID_CURRENT,
	allTabs = false
): Promise<browser.tabs.Tab[]> {
	const tabs = await browser.tabs.query(Object.assign(
		{ hidden: false, windowId },
		allTabs ? {} : { discarded: false }
	));

	const filterNotHighlighted = tabs.filter((tab) => tab.highlighted);

	return filterNotHighlighted.length > 1
		? filterNotHighlighted
		: tabs;
}

// TODO: finish rewrite...
export class TabUtils {

	private _currentTabQuery: browser.tabs.Tab[] = [];

	async _queryTabs(queryInfo: browser.tabs._QueryQueryInfo) {
		this._reset();
		return this._currentTabQuery = await browser.tabs.query(queryInfo);
	}

	async getCurrentTabInWindow(): Promise<browser.tabs.Tab[]> {
		return await this._queryTabs({ active: true, windowId: WINDOW_ID_CURRENT });
	}

	async getCurrentlyHighlightedInWindow(): Promise<browser.tabs.Tab[]> {
		return await this._queryTabs({ highlighted: true, windowId: WINDOW_ID_CURRENT });
	}

	async closeTabs(IDs: number[]): Promise<void> {
		return browser.tabs.remove(IDs);
	}

	closeTab() {
		const tabs = this._currentTabQuery;
		if (tabs && tabs.length === 1) {
			this.closeTabs([tabs[0].id ?? -1]);
		}
	}

	private _reset() {
		this._currentTabQuery = [];
	}
}



// class TabUtils2 {


// 	constructor() {

// 		this._currentTabs;
// 		this._currentTab;
// 	}

// 	getActiveWindow() { }

// 	//
// 	 // Get all opened tabs prioritizing highlighted ones. 
// 	 // @return {Promise<browser.tabs.Tab[]>}
// 	 //
// 	async getActiveTabsInWin() {
// 		const tabs = await browser.tabs.query({
// 			discarded: false,
// 			hidden: false,
// 			windowId: browser.windows.WINDOW_ID_CURRENT,
// 		});

// 		const filterHighlighted = this.filterHighlighted(tabs);

// 		return filterHighlighted.length > 1 ? filterHighlighted : tabs;
// 	}
// 	//
// 	// 
// 	// @param {browser.tabs.Tab[]} tabs
// 	//
// 	filterHighlighted(tabs) {
// 		return tabs.filter((tab) => tab.highlighted);
// 	}


// 	//
// 	// Filter tabs in the current window that match the regex.
// 	// @param {browser.tabs.Tab[]} tabs
// 	// @param {() => browser.tabs.Tab[]} cb
// 	// @return {(browser.tabs.Tab & RuleType)[]}
// 	//
// 	filterTabs(tabs, cb) {
// 		const filtered = [];
// 		for (const tab of tabs) {
// 			const result = cb(tab);
// 			if (result !== undefined) {
// 				filtered.push({ ...tab, ...result });
// 			}
// 		}
// 		return filtered;
// 	}
// 	//
// 	// 
// 	// @param {browser.tabs._QueryQueryInfo} query 
// 	//
// 	async getTabs(query, filter) {
// 		this.tabs = await browser.tabs.query({
// 			discarded: false,
// 			hidden: false,
// 			windowId: browser.windows.WINDOW_ID_CURRENT,
// 		});

// 		if (filter && typeof filter === "function") {
// 			this.tabs.filter(filter);
// 		}

// 		// return filterHighlighted.length > 1 ? filterHighlighted : tabs;
// 		return this;
// 	}
// }

// const tabUtils = new TabUtils();
// tabUtils
// 	.getTabs({
// 		discarded: false,
// 		hidden: false,
// 		windowId: browser.windows.WINDOW_ID_CURRENT,
// 	}, (tab) => {
// 		return tab.highlighted;
// 	})

// 	.filterTabs(function (tab) {
// 		for (const rule of lookupRules) {
// 			if (!rule.target || !rule.folder) {
// 				break;
// 			}

// 			if (!rule.erase) { // let'sforcethis
// 				rule.erase = true;
// 			}

// 			const regex = new RegExp(rule.target);

// 			if (regex.test(tab.url)) {
// 				return true;
// 			}
// 		}
// 	});
