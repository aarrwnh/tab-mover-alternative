import { convertFullWidthToHalf } from "./characterShift";
import { normalizeFilename } from "./normalizeFilename";
import { Notifications } from "./Notifications";

export class Downloads extends Notifications {

	constructor() {
		super();
	}

	async start(
		opts: browser.downloads._DownloadOptions,
		removeAfterComplete = false
	): Promise<number> {
		if (opts.filename) {
			opts.filename = opts.filename.split("/").map((x) => {
				return this._normalizeFilename(convertFullWidthToHalf(x));
			}).join("/");
			if (!/\.\w{3}$/.test(opts.filename)) {
				throw new Error("filename without extension");
			}
		}

		return browser.downloads.download(opts)
			.then((downloadID) => {
				if (downloadID && removeAfterComplete) {
					const onDownloadEnd = this._createOnDownloadEndCb(downloadID);
					browser.downloads.onChanged.addListener(onDownloadEnd);
				}
				return downloadID;
			});
	}

	private _createOnDownloadEndCb(downloadID: number): (_delta: browser.downloads._OnChangedDownloadDelta) => void {
		const onDownloadEnd = (delta: browser.downloads._OnChangedDownloadDelta): void => {
			if (delta.id === downloadID && delta.state?.current !== "in_progress") {
				browser.downloads.onChanged.removeListener(onDownloadEnd);
				browser.downloads.erase({ id: delta.id });
			}
		};
		return onDownloadEnd;
	}

	public _normalizeFilename(str: string): string {
		return normalizeFilename(str);
	}
}