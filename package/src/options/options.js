const DEFAULT_OPTS = { // keys are used as id selector
	switchToTabAfterMoving: false
};

/** @param {Event} e */
function saveOptions(e) {
	e.preventDefault();

	/** @type {HTMLFormElement} */
	const form = e.target;

	const opts = { ...DEFAULT_OPTS };

	Array.from(form.elements)
		.map((el) => {
			if ("option" in el.dataset) {
				switch (el.type) {
					case "checkbox":
						opts[el.id] = el.checked;
						break;
				}
			}
		});

	browser.storage.local.set(opts);
}

function setCurrentChoice(result) {
	for (const [key, val] of Object.entries(result)) {
		if (key in DEFAULT_OPTS) {
			const el = document.querySelector("#" + key);
			switch (el.type) {
				case "checkbox":
					el.checked = (val || DEFAULT_OPTS[key]);
					break;
			}
		}
	}

	browser.storage.local.set(result);
}

function onError(error) {
	console.log(`Error: ${ error }`);
}

function restoreOptions() {
	browser.storage.local.get(DEFAULT_OPTS)
		.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
