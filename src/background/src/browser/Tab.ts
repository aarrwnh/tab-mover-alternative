const { WINDOW_ID_CURRENT } = browser.windows;

export async function closeWindowIfEmpty(windowId = WINDOW_ID_CURRENT): Promise<void> {
	const windows = await browser.windows.getAll();
	const tabs = await browser.tabs.query({ windowId });
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

/** Get opened tabs prioritizing highlighted ones if there are any. */
export async function getActiveTabsInWin(
	windowId = WINDOW_ID_CURRENT,
	discarded = false
): Promise<browser.tabs.Tab[]> {
	const tabs = await browser.tabs.query({
		hidden: false,
		windowId,
		discarded
	});
	const highlighted = tabs.filter((tab) => tab.highlighted);
	if (highlighted.length > 1) {
		return highlighted;
	}
	return tabs;
}

// TODO: finish rewrite...
export class Tabs {

	// private _currentTabQuery: browser.tabs.Tab[] = [];

	private static async _query(
		queryInfo: browser.tabs._QueryQueryInfo,
	): Promise<browser.tabs.Tab[]> {
		return await browser.tabs.query(queryInfo);
	}

	static async getCurrentTab(): Promise<browser.tabs.Tab[]> {
		return await this._query({ active: true, windowId: WINDOW_ID_CURRENT });
	}

	static async getCurrentTabHighlighted(): Promise<browser.tabs.Tab[]> {
		return await this._query({ highlighted: true, windowId: WINDOW_ID_CURRENT });
	}

	/** Get opened tabs prioritizing highlighted ones. */
	static async getActiveTabs(
		windowId = WINDOW_ID_CURRENT,
		allTabs = false
	): Promise<browser.tabs.Tab[]> {
		const tabs = await this._query({
			hidden: false,
			windowId,
			discarded: allTabs ? true : false
		});

		const filterNotHighlighted = tabs.filter((tab) => tab.highlighted);

		return filterNotHighlighted.length > 1
			? filterNotHighlighted
			: tabs;
	}

	static async closeEmptyWindow(windowId = WINDOW_ID_CURRENT): Promise<void> {
		const tabs = await this.getActiveTabs(windowId);
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
	// private _filterNotHighlighted(tabs: browser.tabs.Tab[]): browser.tabs.Tab[] {
	//    return tabs.filter((tab) => tab.highlighted);
	// }

	static async close(IDs: number[]): Promise<void> {
		return browser.tabs.remove(IDs);
	}

	// closeTab() {
	//    const tabs = this._currentTabQuery;
	//    if (tabs && tabs.length === 1) {
	//       this.closeTabs([tabs[0].id ?? -1]);
	//    }
	// }

	// private _reset() {
	//    this._currentTabQuery = [];
	// }
}
