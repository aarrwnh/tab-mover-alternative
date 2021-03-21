"use strict";

const modules = window.modules || {};

const settings = modules.settings = (function () {
	const DEFAULT = { // keys are used as id selectors
		switchToTabAfterMoving: false,
		showLastWindowIDBadge: false,
		moveableContainers: [],
		// debugMode: false
	};

	const _settings = {};

	Object.defineProperty(_settings, "reset", {
		enumerable: false,
		value: () => browser.storage.local.set(DEFAULT)
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
			.then(async (result) => {
				if (Object.entries(result).length === 0) {
					await _settings.reset();
				}
			});
	})();

	// event listeners
	function updateSettings(changes, areaName) {
		if (areaName === "local") {
			Object.keys(settings)
				.filter((key) => changes[key] !== undefined)
				.forEach((key) => settings[key] = changes[key].newValue);
		}
	}

	browser.storage.onChanged.addListener(updateSettings);

	return _settings;
})();
