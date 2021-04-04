"use strict";

const modules = window.modules || {};

const settings = modules.settings = (function () {
	const DEFAULT = { // keys are used as id selectors
		switchToTabAfterMoving: false,
		showLastWindowIDBadge: false,
		moveableContainers: [],
		tabTravelDistance: 0,
		debugMode: false,
		recentTabTimeout: 3600
	};

	const _settings = {};

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
					_settings.reset();
				}
			});
	})();

	// event listeners
	function updateSettings(changes, areaName) {
		if (areaName === "local") {
			Object.keys(settings).forEach((key) => {
				if (changes[key] !== undefined) {
					settings[key] = changes[key].newValue;
				}
			});
		}
	}

	browser.storage.onChanged.addListener(updateSettings);

	return _settings;
})();
