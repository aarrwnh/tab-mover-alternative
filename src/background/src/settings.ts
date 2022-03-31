export async function setupSettings() {

	const DEFAULT: Addon.DefaultSettings = {
		switchToTabAfterMoving: false,
		showLastWindowIDBadge: false,
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

	const _settings: Addon.Settings = Object.assign({});

	Object.defineProperty(_settings, "reset", {
		enumerable: false,
		value: () => {
			browser.storage.local.clear();
			browser.storage.local.set(DEFAULT);
		}
	});


	await browser.storage.local.get(DEFAULT)
		.then((result) => {
			Object.entries(result).forEach(([key, val]) => {
				_settings[key] = val;
			});
			return _settings;
		});


	await browser.storage.local.get()
		.then((result) => {
			const currentSettings = Object.keys(result);
			if (currentSettings.length === 0
				|| currentSettings.length !== Object.keys(_settings).length) {
				_settings.reset();
			}
		});


	function updateSettings(changes: { [key: string]: browser.storage.StorageChange }, areaName: string) {
		if (areaName === "local") {
			Object.keys(_settings).forEach((key) => {
				if (changes[key] !== undefined) {
					_settings[key] = changes[key].newValue;
				}
			});
		}
	}

	browser.storage.onChanged.addListener(updateSettings);

	return _settings;
}
