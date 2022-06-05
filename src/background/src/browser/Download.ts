import { convertFullWidthToHalf } from "../utils/characterShift";
import { replaceIllegalCharacters } from "../utils/replaceIllegalCharacters";
import { Notifications } from "./Notifications";

export class Downloads extends Notifications {
	async start(
		opts: browser.downloads._DownloadOptions,
		removeAfterComplete = false,
		_retrying = false
	): Promise<number> {
		if (opts.filename && !_retrying) {
			opts.filename = opts.filename.split("/").map((x) => {
				return replaceIllegalCharacters(convertFullWidthToHalf(x));
			}).join("/");

			if (!/\.\w{3,4}$/.test(opts.filename)) {
				throw new Error("filename without extension");
			}
		}

		let downloadId = -1;
		try {
			downloadId = await browser.downloads.download(opts);
		}
		catch (err) {
			if (err instanceof Error) {
				const invalidFilename = err.message.includes("illegal characters");
				console.error(err.message + ": " + opts.url);
				if (invalidFilename) {
					if (opts.filename?.match(/[^\x00-\x7F]{1}\//)) {
						// try to add underline first
						opts.filename = opts.filename.replace(/([^\x00-\x7F]{1})\//g, "$1_/");
						return this.start(opts, removeAfterComplete, true);
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
						return this.start(opts, removeAfterComplete, true);
					}
				}
				return downloadId;
			}
		}
		return this._onDownloadStateChange(downloadId, removeAfterComplete);
	}

	private _onDownloadStateChange(downloadID: number, removeAfterComplete = false): Promise<number> {
		return new Promise(function (resolve) {
			function erase(id: number): void {
				browser.downloads.erase({ id });
				browser.downloads.onChanged.removeListener(onDownloadEnd);
			}

			function onDownloadEnd(delta: browser.downloads._OnChangedDownloadDelta): void {
				if (delta.state?.current === "interrupted") {
					console.error(new Error(delta.error?.current));
					resolve(-1);
					erase(delta.id);
					return;
				}
				else {
					resolve(downloadID);
				}

				if (removeAfterComplete
					&& delta.id === downloadID
					&& delta.state?.current === "complete") {
					erase(delta.id);
				}
			}

			browser.downloads.onChanged.addListener(onDownloadEnd);
		});
	}
}
