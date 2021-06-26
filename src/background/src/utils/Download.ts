import { normalizeFilename } from "./normalizeFilename";

interface DownloadSettings {
	removeAfterComplete: boolean;
}

interface DownloadBrowserOptions {
	notifications?: Partial<browser.notifications.CreateNotificationOptions>;
}

export class Download {
	private _settings: DownloadSettings = {
		removeAfterComplete: false
	}
	private _opts: DownloadBrowserOptions = {};

	constructor(
		settings: DownloadSettings,
		opts: DownloadBrowserOptions = {}
	) {
		Object.assign(this._settings, settings);

		if (opts.notifications) {
			this._opts.notifications = opts.notifications;
		}
	}

	async start(opts: browser.downloads._DownloadOptions): Promise<void> {
		return browser.downloads.download(opts)
			.then((downloadID) => {
				if (downloadID && this._settings.removeAfterComplete) {
					const onDownloadEnd = this._createOnDownloadEndCb(downloadID);
					browser.downloads.onChanged.addListener(onDownloadEnd);
				}
			})
			.catch((err: Error) => {
				if (typeof err === "object" && err.name && this._opts.notifications) {
					this._opts.notifications.message = err.name + ": " + err.message;
					console.error(err);
				}
				this._showNotification(this._opts.notifications as unknown as never);
			});
	}

	private _createOnDownloadEndCb(downloadID: number): (_delta: browser.downloads._OnChangedDownloadDelta) => void {
		const onDownloadEnd = (delta: browser.downloads._OnChangedDownloadDelta): void => {
			if (delta.id === downloadID && delta.state?.current !== "in_progress") {
				browser.downloads.onChanged.removeListener(onDownloadEnd);
				browser.downloads.erase({ id: delta.id });
				this._showNotification(this._opts.notifications as unknown as never);
			}
		};
		return onDownloadEnd;
	}

	private _showNotification(opts: browser.notifications.CreateNotificationOptions | void): Promise<string | void> {
		if (opts) {
			return browser.notifications.create(opts);
		}
		return Promise.resolve();
	}

	public normalizeFilename(str: string): string {
		return normalizeFilename(str);
	}
}