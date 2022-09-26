import { convertFullWidthToHalf } from "../utils/characterShift";
import { replaceIllegalCharacters } from "../utils/replaceIllegalCharacters";
import { Notifications } from "./Notifications";

function encodeFilename(opts: browser.downloads._DownloadOptions) {
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
}

function tryUnderlineFilename(opts: browser.downloads._DownloadOptions) {
	opts.filename = opts.filename!.replace(/([^\x00-\x7F]{1})\//g, "$1_/");
}


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

		return new Promise<void>((resolve, reject) => {
			const erase = (id: number): void => {
				if (this._eraseAfterComplete) {
					browser.downloads.erase({ id });
				}
				browser.downloads.onChanged.removeListener(onDownloadEnd);
			};

			function onDownloadEnd(delta: browser.downloads._OnChangedDownloadDelta): void {
				if (delta.state) {
					if (delta.state.current === "interrupted") {
						reject(delta.error);
					}
					if (delta.state.current === "complete") {
						erase(delta.id);
						resolve();
					}
				}
			}

			browser.downloads.onChanged.addListener(onDownloadEnd);

			browser.downloads.download(opts)
				.catch((err: Error) => {
					console.error(err);

					if (err instanceof Error) {
						const isInvalidFilename = err.message.includes("illegal characters");

						if (isInvalidFilename) {
							if (opts.filename?.match(/[^\x00-\x7F]{1}\//)) {
								tryUnderlineFilename(opts);
							}
							else {
								encodeFilename(opts);
							}

							resolve(this.start(opts, true));

							return;
						}
						else {
							throw new Error(err.message + ": " + opts.url);
						}
					}

					reject("unknown error");
				});
		});
	}
}
