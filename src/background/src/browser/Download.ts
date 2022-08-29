import { convertFullWidthToHalf } from "../utils/characterShift";
import { replaceIllegalCharacters } from "../utils/replaceIllegalCharacters";
import { Notifications } from "./Notifications";

export class Downloads extends Notifications {
	private _eraseAfterComplete?: boolean;

	constructor(opts?: {
		eraseOnComplete?: boolean;
	}) {
		super();

		if (opts) {
			this._eraseAfterComplete = opts.eraseOnComplete || true;
		}
	}

	async start(opts: browser.downloads._DownloadOptions, _retrying = false): Promise<void> {
		if (opts.filename && !_retrying) {
			opts.filename = opts.filename.split("/").map((x) => {
				return replaceIllegalCharacters(convertFullWidthToHalf(x));
			}).join("/");

			if (!/\.\w{3,4}$/.test(opts.filename)) {
				throw new Error("filename without extension");
			}
		}

		// add some cooldown between each download because it gets stuck
		// at weird point
		await new Promise((r) => setTimeout(r, 50)); // 30 -- too low

		let downloadID = -1;
		try {
			downloadID = await browser.downloads.download(opts);
		}
		catch (err) {
			console.error(err);
			if (err instanceof Error) {
				const isInvalidFilename = err.message.includes("illegal characters");
				if (isInvalidFilename) {
					if (opts.filename?.match(/[^\x00-\x7F]{1}\//)) {
						// try to add underline first
						opts.filename = opts.filename.replace(/([^\x00-\x7F]{1})\//g, "$1_/");
						return this.start(opts, true);
					}
					else {
						// hack/bug?: even having unicode char before slash will error when saving,
						// so just save as encoded URI, and then decode manually after save
						// with eg. python's `urllib.parse.unquote`
						opts.filename = opts.filename
							?.split("/")
							.map((x, i, arr) => {
								// skip on filename, just encode folders
								return i !== arr.length - 1 ? encodeURIComponent(x) : x;
							})
							.join("/");
						return this.start(opts, true);
					}
				}
				throw new Error(err.message + ": " + opts.url);
			}
		}

		const downloadItem = await browser.downloads.search({ id: downloadID });
		if (downloadItem.length > 0 && downloadItem[0].state === "complete") {
			browser.downloads.erase({ id: downloadID });
			return Promise.resolve();
		}

		return await this._onDownloadStateChange();
	}

	private async _onDownloadStateChange(): Promise<void> {
		let removeAfterComplete = this._eraseAfterComplete;

		return new Promise<void>(function (resolve, reject) {
			function erase(id: number): void {
				if (removeAfterComplete) {
					browser.downloads.erase({ id });
				}
				browser.downloads.onChanged.removeListener(onDownloadEnd);
			}

			function onDownloadEnd(delta: browser.downloads._OnChangedDownloadDelta): void {
				if (delta.state) {
					if (delta.state.current === "interrupted") {
						removeAfterComplete = false;
						reject(delta.error);
					}
					if (delta.state.current === "complete") {
						erase(delta.id);
						resolve();
					}
				}
			}

			browser.downloads.onChanged.addListener(onDownloadEnd);
		});
	}
}
