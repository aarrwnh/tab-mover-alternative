export const visitedTabsHistory = (new class _ {
	private _history = new Map<number, number[]>();

	public async activateRecent(position = 1) {
		const currentWindow = await browser.windows.getCurrent();
		const sequence = this._history.get(currentWindow.id || -1) || [];

		if (sequence.length < position) {
			return;
		}
		if (sequence) {
			const prevTabId = sequence[sequence.length - position - 1];
			browser.tabs.update(prevTabId, { active: true });
		}
	}

	public async remove(tabId: number, windowId?: number) {
		if (!windowId) {
			const currentWindow = await browser.windows.getCurrent();
			windowId = currentWindow.id || -1;
		}
		const sequence = this._history.get(windowId);
		if (sequence) {
			const idx = sequence.indexOf(tabId);
			if (idx !== -1) {
				sequence.splice(idx, 1);
			}
			this._history.set(windowId, sequence);
		}
	}

	public async add(tabId: number, windowId?: number) {
		if (!windowId) {
			const currentWindow = await browser.windows.getCurrent();
			windowId = currentWindow.id || -1;
		}
		let sequence = this._history.get(windowId);

		if (sequence) {
			// move activated tab to the end
			const idx = sequence.indexOf(tabId);
			if (idx !== -1) {
				sequence.splice(idx, 1);
			}
			sequence.push(tabId);
		}
		else {
			sequence = [tabId];
		}

		this._history.set(windowId, sequence);
	}
});
