export class TabUtils {

	async getCurrentTabInWindow(): Promise<browser.tabs.Tab[]> {
		return await browser.tabs.query({
			active: true,
			windowId: browser.windows.WINDOW_ID_CURRENT
		});
	}
}