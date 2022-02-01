export function createMenuItem(createProperties: browser.menus._CreateCreateProperties): Promise<string | number> {
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
