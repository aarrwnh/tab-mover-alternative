enum TabConnectionError {
	BadQuery = "could not get response for the send query",
	NoTab = "no tabId specified",
	NoConnection = "could not establish connection with content script..."
}

export class TabConnection {
	constructor(private tabId?: number) {
		if (!tabId) {
			throw new Error(TabConnectionError.NoTab);
		}
	}

	private async _queryTabContentScript(msgQuery: {
		context: {
			querySelector: string;
		};
	}): Promise<string | undefined> {
		const { tabId } = this;

		return new Promise(function (resolve, reject) {
			if (tabId) {
				const port = browser.tabs.connect(tabId);
				port.postMessage(msgQuery);
				const listener = function (response: any) {
					if (response.text) {
						resolve(response.text);
					}
					else {
						console.log(TabConnectionError.BadQuery);
						resolve(undefined);
					}
					port.disconnect();
					port.onMessage.removeListener(listener);
				};
				port.onMessage.addListener(listener);
			}
			else {
				reject(TabConnectionError.NoConnection);
			}
		});
	}

	public async querySelector(selector: string): Promise<string | undefined> {
		return await this._queryTabContentScript({
			context: { querySelector: selector }
		});
	}
}