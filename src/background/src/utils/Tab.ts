const { WINDOW_ID_CURRENT } = browser.windows;

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
		});
	}
}