
let opts: { [key: string]: any };

function onError(error: string) {
	console.log(`Error: ${ error }`);
}

async function saveOptions(e: Event) {
	e.preventDefault();

	const form = e.target as HTMLFormElement;
	const submitButton = form.elements.namedItem("submit") as HTMLElement;

	for (const el of form.elements as unknown as NodeListOf<HTMLInputElement>) {
		if ("option" in el.dataset) {
			switch (el.type) {
				case "text": {
					const separator = el.getAttribute("data-separator");
					if (separator) {
						opts[el.id] = el.value
							.split(separator)
							.map((x) => x.trim());
					}
					break;
				}

				case "number": {
					opts[el.id] = Number(el.value);
					break;
				}

				case "hidden": {
					if (el.id === "moveableContainers") {
						const identities = await getIdentities();
						const cookieStoreIDs =
							identities.getContainerCookieStoreIDs(el.value);
						opts[el.id] = cookieStoreIDs;
					}
					break;
				}

				case "checkbox": {
					opts[el.id] = el.checked;
					break;
				}
			}
		}
	}

	browser.storage.local
		.set(opts)
		.then(() => {
			submitButton.textContent = "Saved!";
			setTimeout(() => {
				submitButton.textContent = "Save";
			}, 1000);
		})
		.catch(console.log);
}

async function getIdentities(): Promise<{
	list: browser.contextualIdentities.ContextualIdentity[];
	names: string[];
	cookieStoreIDs: string[];
	getContainerCookieStoreIDs(cookieStoreName: string): string[];
	getContainerNames(cookieStoreIDs: string[]): string;
}> {
	const o: {
		names: string[];
		cookieStoreIDs: string[];
	} = {
		names: [],
		cookieStoreIDs: [],
	};

	const identities = await browser.contextualIdentities.query({});

	identities.forEach((identity) => {
		o.names.push(identity.name);
		o.cookieStoreIDs.push(identity.cookieStoreId);
	});

	return {
		...o,
		list: identities,

		getContainerCookieStoreIDs(cookieStoreName: string): string[] {
			const cookieNames = cookieStoreName
				.replace(/['"]/g, "")
				.split(";")
				.map((x) => x.trim());

			return cookieNames
				.map((x) => {
					// @ts-ignore
					const i = this.names.indexOf(x);
					// @ts-ignore
					return i !== -1 ? this.list[i].cookieStoreId : false;
				})
				.filter(Boolean);
		},

		getContainerNames(cookieStoreIDs: string[]): string {
			return cookieStoreIDs
				.map((x) => {
					// @ts-ignore
					const i = this.cookieStoreIDs.indexOf(x);
					// @ts-ignore
					return i !== -1 ? this.list[i].name : false;
				})
				.filter(Boolean)
				.join("; ");
		},
	};
}

function createContainerList(
	identities: browser.contextualIdentities.ContextualIdentity[],
	el: HTMLInputElement
) {
	if (identities.length > 0) {
		const availableContainers = document.querySelector(
			"#availableContainers"
		);
		const setContainers = document.querySelector("#setContainers");

		if (!availableContainers || !setContainers) {
			return;
		}

		for (let idx = 0; idx < identities.length; idx++) {
			const { name, colorCode, iconUrl } = identities[idx];

			const icon = document.createElement("img");
			icon.src = iconUrl;
			icon.className = "container-icon";

			const span = document.createElement("span");
			span.className = "available-container";
			span.style.cssText = `--identity-border-color-hover: ${ colorCode }; --identity-border-color: ${ colorCode }55; --identity-icon: ${ iconUrl };`;

			span.appendChild(icon);
			span.appendChild(document.createTextNode(name));

			span.addEventListener("click", (e) => {
				e.preventDefault();

				if (!el.value.includes(name)) {
					setContainers.appendChild(span);
					el.value += (el.value.length > 0 ? "; " : "") + name;
				}
				else {
					availableContainers.appendChild(span);
					el.value = el.value.replace(new RegExp(name + "(; )?"), "");
				}
			});

			if (el.value.includes(name)) {
				setContainers.appendChild(span);
			}
			else {
				availableContainers.appendChild(span);
			}
		}
	}
}

async function setCurrentChoice(result: { [key: string]: any }) {
	opts = result;

	for (let [key, val] of Object.entries(result)) {
		if (key in opts) {
			const el = document.querySelector<HTMLInputElement>("#" + key);

			if (!el) continue;

			val = val || opts[key];

			switch (el.type) {
				case "text": {
					const separator = el.getAttribute("data-separator");

					if (Array.isArray(val) && separator) {
						el.value = val.join(separator + " ");
					}

					break;
				}

				case "number": {
					el.value = val;
					break;
				}

				case "hidden": {
					if (key === "moveableContainers") {
						const identities = await getIdentities();
						const currentValue = identities.getContainerNames(val);
						el.value = currentValue;

						createContainerList(identities.list, el);
					}
					break;
				}

				case "checkbox": {
					el.checked = val;
					break;
				}
			}
		}
	}

	browser.storage.local.set(result);
}

export default async function main() {
	async function restoreOptions() {
		await browser.storage.local.get().then(setCurrentChoice, onError);
	}

	await restoreOptions();

	document.addEventListener("DOMContentLoaded", restoreOptions);
	document.querySelector("form")?.addEventListener("submit", saveOptions);
	document.querySelector("#reset")?.addEventListener("click", () => {
		browser.storage.local.clear();
		browser.runtime.reload();
	});
}
