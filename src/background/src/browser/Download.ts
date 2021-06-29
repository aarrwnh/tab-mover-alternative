import { convertFullWidthToHalf } from "../utils/characterShift";
import { replaceIllegalCharacters } from "../utils/replaceIllegalCharacters";
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
				return this.normalizeFilename(convertFullWidthToHalf(x));
			}).join("/");

			if (!/\.\w{3}$/.test(opts.filename)) {
				throw new Error("filename without extension");
			}
		}

		const downloadId = await browser.downloads.download(opts);

		if (downloadId && removeAfterComplete) {
			return await this._onDownloadStateChange(downloadId);
		}

		return downloadId;
	}

	private _onDownloadStateChange(downloadID: number): Promise<number> {
		return new Promise((resolve, reject) => {
			const onDownloadEnd = (delta: browser.downloads._OnChangedDownloadDelta): void => {

				if (delta.state?.current === "interrupted") {
					reject(new Error(delta.error?.current));
					return;
				}

				if (delta.id === downloadID && delta.state?.current !== "in_progress") {
					browser.downloads.onChanged.removeListener(onDownloadEnd);
					browser.downloads.erase({ id: delta.id });
					resolve(downloadID);
				}
			};

			browser.downloads.onChanged.addListener(onDownloadEnd);
		});
	}

	public normalizeFilename(str: string): string {
		return replaceIllegalCharacters(str);
	}
}