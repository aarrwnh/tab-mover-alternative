import { convertFullWidthToHalf } from "../utils/characterShift";
import { replaceIllegalCharacters } from "../utils/replaceIllegalCharacters";
import { Notifications } from "./Notifications";

export class Downloads extends Notifications {

	constructor() {
		super();
	}

	async start(
		opts: browser.downloads._DownloadOptions,
		removeAfterComplete = false,
		retrying = false
	): Promise<number> {
		if (opts.filename && !retrying) {
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
				if (invalidFilename && opts.filename?.match(/[^\x00-\x7F]{1}/)) {
					// hack/bug?: even having unicode char before slash will error when saving,
					// so just save as encoded URI, and then decode manually after save
					// with eg. python's `urllib.parse.unquote`
					opts.filename = opts.filename
						.split("/")
						.map((x, i, arr) => {
							// skip on filename, just encode folders
							return i !== arr.length - 1 ? encodeURIComponent(x) : x;
						})
						.join("/");
					// .replace(/([^\x00-\x7F]{1})\//g, "$1_/");

					return this.start(opts, removeAfterComplete, true);
				}
			}
			return downloadId;
		}
		return await this._onDownloadStateChange(downloadId, removeAfterComplete);
	}

	private _onDownloadStateChange(downloadID: number, removeAfterComplete = false): Promise<number> {
		return new Promise((resolve, reject) => {
			const onDownloadEnd = (delta: browser.downloads._OnChangedDownloadDelta): void => {
				if (delta.state?.current === "interrupted") {
					reject(new Error(delta.error?.current));
					return;
				}

				if (
					removeAfterComplete
					&& delta.id === downloadID
					&& delta.state?.current !== "in_progress"
				) {
					browser.downloads.onChanged.removeListener(onDownloadEnd);
					browser.downloads.erase({ id: delta.id });
				}

				resolve(downloadID);
			};

			browser.downloads.onChanged.addListener(onDownloadEnd);
		});
	}
}
