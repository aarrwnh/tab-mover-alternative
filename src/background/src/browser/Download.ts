import { convertFullWidthToHalf } from "../utils/characterShift";
import { sanitizeFilename } from "../utils/sanitizeFilename";
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
	// try to put underline as last character for folder name
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
				return sanitizeFilename(convertFullWidthToHalf(x));
			}).join("/");

			if (!/\.\w{3,4}$/.test(opts.filename)) {
				throw new Error("filename without extension");
			}

			// Unknown why using ".url" as extension doesn't always work (on windows at least),
			// and from time to time throws "illegal characters" error.
			// `browser.downloads.download({ url: URL.createObjectURL(new Blob(["test"])), filename: "something.url" });`
			// Save with different extension and rename after it is saved on disk.
			if (/\.(url|lnk)$/.test(opts.filename)) {
				opts.filename = opts.filename.replace(/\.(url|lnk)$/, ".link");
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
								console.warn("trying underlined filename", opts.filename);
							}
							else {
								encodeFilename(opts);
								console.warn("encoding filename as last resort", opts.filename);
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
