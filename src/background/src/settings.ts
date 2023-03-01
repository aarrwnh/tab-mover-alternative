// TODO: move somewhere else?
export const DEFAULT_SETTINGS: Addon.DefaultSettings = {
	switchToTabAfterMoving: false,
	moveableContainers: [],
	tabTravelDistance: 0,
	debugMode: false,
	recentTabTimeout: 3600,
	movePinnedTabs: false,
	bookmarksAlwaysToChildFolder: [],
	bookmarksSaveLocation: "",
	imageSaverRules: [],
	bookmarksCloseOnComplete: true,
	imageSaverCloseOnComplete: true,
};

export async function setupSettings() {

	const _settings = {} as Addon.Settings;

	Object.defineProperty(_settings, "reset", {
		enumerable: false,
		value: () => {
			browser.storage.local.clear();
			browser.storage.local.set(DEFAULT_SETTINGS);
		}
	});

	await browser.storage.local.get(DEFAULT_SETTINGS)
		.then((result) => {
			Object.entries(result as Addon.Settings).forEach(([key, val]) => {
				_settings[key] = val;
			});
			return _settings;
		});

	function updateSettings(
		changes: { [key: string]: browser.storage.StorageChange; },
		areaName: string
	) {
		if (areaName === "local") {
			Object.keys(_settings).forEach((key) => {
				if (changes[key] !== undefined) {
					// eslint-disable-next-line
					_settings[key] = changes[key].newValue;
				}
			});
		}
	}

	browser.storage.onChanged.addListener(updateSettings);

	return _settings;
}
