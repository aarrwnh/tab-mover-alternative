import { convertFullWidthToHalf } from "../utils/characterShift";
import { replaceIllegalCharacters } from "../utils/replaceIllegalCharacters";
import { Notifications } from "./Notifications";

export class Downloads extends Notifications {
	async start(
		opts: browser.downloads._DownloadOptions,
		removeAfterComplete = false,
		_retrying = false
	): Promise<void> {
		if (opts.filename && !_retrying) {
			opts.filename = opts.filename.split("/").map((x) => {
				return replaceIllegalCharacters(convertFullWidthToHalf(x));
			}).join("/");

			if (!/\.\w{3,4}$/.test(opts.filename)) {
				throw new Error("filename without extension");
			}
		}

		try {
			await browser.downloads.download(opts);
		}
		catch (err) {
			if (err instanceof Error) {
				const isInvalidFilename = err.message.includes("illegal characters");
				if (isInvalidFilename) {
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
				throw new Error(err.message + ": " + opts.url);
			}
		}
		return this._onDownloadStateChange(removeAfterComplete);
	}

	private _onDownloadStateChange(removeAfterComplete = false): Promise<void> {
		return new Promise<void>(function (resolve, reject) {
			function erase(id: number, erase: boolean): void {
				if (erase) {
					browser.downloads.erase({ id });
				}
				browser.downloads.onChanged.removeListener(onDownloadEnd);
			}

			function onDownloadEnd(delta: browser.downloads._OnChangedDownloadDelta): void {
				if (delta.state) {
					if (delta.state.current !== "in_progress") {
						if (delta.state.current === "interrupted") {
							removeAfterComplete = false;
							reject("interrupted");
						}
						erase(delta.id, removeAfterComplete);
						resolve();
					}
				}
			}

			browser.downloads.onChanged.addListener(onDownloadEnd);
		});
	}
}
