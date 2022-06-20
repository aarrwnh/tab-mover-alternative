import type { MessageQuery } from "../../types";

enum TabConnectionError {
	"BadQuery" = "could not get response for the send query",
	"NoTab" = "no tabId specified",
	"NoConnection" = "could not establish connection with content script..."
}

export class TabConnection {
	constructor(private tabId?: number) {
		if (!tabId) {
			throw new Error(TabConnectionError.NoTab);
		}
	}

	private async _queryTabContentScript<T>(msgQuery: MessageQuery): Promise<T | undefined> {
		const { tabId } = this;

		return new Promise(function (resolve, reject) {
			if (tabId) {
				const port = browser.tabs.connect(tabId);
				port.postMessage(msgQuery);
				const listener = function (response: any) {
					if (response.result) {
						resolve(response.result as T);
					}
					else {
						console.error(TabConnectionError.BadQuery);
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

	public async querySelectorText(selector: string): Promise<string | undefined> {
		return await this._queryTabContentScript({
			context: { type: "selector", target: selector }
		});
	}

	public async matchAllText(regex: string): Promise<string[][] | undefined> {
		return await this._queryTabContentScript({
			context: { type: "RegExp", target: regex }
		});
	}

	public async queryXPath(XPath: string, attribute: "href" | "src"): Promise<string[] | undefined> {
		return await this._queryTabContentScript({
			context: { type: "XPath", target: XPath, attribute }
		});
	}
}
