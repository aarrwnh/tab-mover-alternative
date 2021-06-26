function setup() {
	const DEFAULT = { // keys are used as id selectors
		switchToTabAfterMoving: false,
		showLastWindowIDBadge: false,
		moveableContainers: [],
		tabTravelDistance: 0,
		debugMode: false,
		recentTabTimeout: 3600,
		movePinnedTabs: false,
	};

	const _settings: Partial<Settings> = {};

	Object.defineProperty(_settings, "reset", {
		enumerable: false,
		value: () => {
			browser.storage.local.clear();
			browser.storage.local.set(DEFAULT);
		}
	});

	(async () => {
		await browser.storage.local.get(DEFAULT)
			.then((result) => {
				Object.entries(result).forEach(([key, val]) => {
					// @ts-ignore
					_settings[key] = val;
				});
				return _settings;
			});


		// TODO: temp fix for when ?
		await browser.storage.local.get()
			.then((result) => {
				const currentSettings = Object.keys(result);
				if (currentSettings.length === 0
					|| currentSettings.length !== Object.keys(_settings).length) {
					// @ts-ignore
					_settings.reset();
				}
			});
	})();

	// event listeners
	function updateSettings(changes: { [key: string]: browser.storage.StorageChange }, areaName: string) {
		if (areaName === "local") {
			Object.keys(setup).forEach((key) => {
				if (changes[key] !== undefined) {
					// @ts-ignore
					setup[key] = changes[key].newValue;
				}
			});
		}
	}

	browser.storage.onChanged.addListener(updateSettings);

	return _settings;
}

export const settings = setup() as Settings;
