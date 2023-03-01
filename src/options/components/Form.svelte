<script lang="ts">
	import type { TSettings } from "../types/FormElements";
	import { DEFAULT_SETTINGS } from "../../background/src/settings";
	import Checkbox from "./Checkbox.svelte";
	import ImageSaver from "./ImageSaver/index.svelte";
	import Input from "./Input.svelte";
	import InputArray from "./InputArray.svelte";
	import Range from "./Range.svelte";
	import MultiAccountContainer from "./MultiAccountContainers.svelte";
	import { writable } from "svelte/store";

	export let onSubmit: FormChangeCallback = undefined;
	export let onChange: FormChangeCallback = undefined;
	export let formFieldValues: TSettings;

	let showSavedIndicator = false;

	function parseFieldsToObject(fields: TSettings): Addon.Settings | void {
		const parsedSettings = {} as Addon.Settings;

		for (const section of Object.values(fields)) {
			for (let idx = 0; idx < section.opts.length; idx++) {
				let { name, value, valid } = section.opts[idx];

				if (!valid) return;

				if (name === "imageSaverRules") {
					value = (value as Addon.ImageSaverRule[]).filter(function (x) {
						return !(x.folder === "" || x.target === "");
					});

					value.forEach((item) => {
						Object.assign(
							{
								findLargestTarget: "",
								findLargest: false,
								disabled: false,
							},
							item
						);
					});
				}
				// @ts-ignore
				parsedSettings[name] = value;
			}
		}

		return parsedSettings;
	}

	function generateOptionsTable(): Addon.Settings | void {
		const fields = parseFieldsToObject(formFieldValues);

		if (!fields) {
			return;
		}

		showSavedIndicator = true;
		setTimeout(function () {
			showSavedIndicator = false;
		}, 1000);

		saveStorage(fields);

		return fields;
	}

	function handleFormSubmit(): void {
		if (onSubmit) {
			onSubmit(generateOptionsTable);
		}
	}

	function handleFormChange(): void {
		if (onChange) {
			onChange(generateOptionsTable);
		}
	}

	// Overwrite form defualt values with storage contents
	async function getStorage(): Promise<void> {
		const options = (await browser.storage.local.get()) as Addon.Settings;

		for (const section of Object.values(formFieldValues)) {
			for (let idx = 0; idx < section.opts.length; idx++) {
				const { name } = section.opts[idx];

				if (name in options) {
					section.opts[idx].value = options[name];
				}
			}
		}
	}

	async function saveStorage(opts: Addon.Settings) {
		await browser.storage.local.set(opts);
	}

	function exportSettings() {
		const json = JSON.stringify(
			parseFieldsToObject(formFieldValues),
			null,
			2
		);
		const urlFileBodyBlob = new Blob([json], { type: "text/plain" });
		const objectURL = URL.createObjectURL(urlFileBodyBlob);
		const d = new Date()
			.toLocaleString("ja-JP", {
				day: "2-digit",
				year: "numeric",
				month: "2-digit",
				hour: "2-digit",
				minute: "numeric",
			})
			.replace(/[\/:]/g, "-")
			.replace("\x20", "~");

		browser.downloads.download({
			conflictAction: "uniquify",
			url: objectURL,
			filename: "tab-mover-alternative-backup-" + d + ".json",
		});
	}

	function importSettings(): void {
		const input = document.createElement("input");
		input.style.display = "none";
		input.type = "file";
		input.accept = ".json";
		document.body.appendChild(input);
		input.addEventListener("change", function () {
			if (input.files && input.files.length === 1) {
				const file = input.files[0];
				if (file.size > 1e8) {
					return;
				}
				const reader = new FileReader();
				reader.addEventListener("loadend", function (ev) {
					input.remove();
					if (!ev.target) {
						return;
					}
					if (typeof ev.target.result !== "string") {
						return;
					}
					const contents = JSON.parse(ev.target.result) as Addon.Settings;
					const hasSameKeys = Object.keys(contents).every((key) =>
						DEFAULT_SETTINGS.hasOwnProperty(key)
					);
					if (hasSameKeys) {
						browser.storage.local.set(contents).then(function () {
							browser.runtime.reload();
						});
					} else {
						console.warn("file contents do not have correct keys");
					}
				});
				reader.readAsText(file, "utf-8");
			}
			document.body.removeChild(input);
		});
		input.click();
	}

	function resetSettings(): void {
		browser.storage.local.set(DEFAULT_SETTINGS).then(function () {
			browser.runtime.reload();
		});
	}

	let tabs: string[] = [];
	// const _tabs = setContext([], {});
	const activeTabId = writable(0);
	activeTabId.subscribe((a) => {
		// fix id if out of bounds
		if (a > tabs.length - 1) {
			activeTabId.set(0);
		} else if (a < 0) {
			activeTabId.set(tabs.length - 1);
		}
	});

	function addTab(tabTitle: string): string {
		tabs = tabs.concat(tabTitle);
		return "";
	}
</script>

{#await getStorage()}
	...
{:then _}
	<form
		on:change|preventDefault={handleFormChange}
		on:submit|preventDefault={handleFormSubmit}
	>
		<div
			id="option-tabs"
			on:wheel|preventDefault={(ev) => {
				const inc = ev.deltaY > 0 ? 1 : ev.deltaY < 0 ? -1 : 0;
				activeTabId.set($activeTabId + inc);
			}}
		>
			{#each tabs as tab, id}
				<div
					class:active={$activeTabId === id}
					class:notactive={$activeTabId !== id}
					on:click={() => {
						activeTabId.set(id);
					}}
				>
					{tab}
				</div>
			{/each}
		</div>

		{#each Object.entries(formFieldValues) as [sectionName, formSection], id}
			<section
				data-name={sectionName}
				class:hidden-section={id !== $activeTabId}
			>
				{addTab(formSection.title)}

				{#each formSection.opts as field}
					{#if field.type === "Checkbox"}
						<Checkbox
							id={field.name}
							name={field.name}
							annotation={field.annotation}
							bind:checked={field.value}
						>
							{field.label}
						</Checkbox>
					{:else if field.type === "Range"}
						<Range
							id={field.name}
							name={field.name}
							label={field.label}
							annotation={field.annotation}
							bind:value={field.value}
							min={field.min}
							max={field.max}
							step={field.step}
						/>
					{:else if field.type === "String" || field.type === "Number"}
						<Input
							id={field.name}
							name={field.name}
							label={field.label}
							annotation={field.annotation}
							bind:value={field.value}
							placeholder={field.placeholder}
						/>
					{:else if field.type === "Array"}
						{#if field.name === "moveableContainers"}
							<MultiAccountContainer bind:value={field.value} />
						{:else}
							<InputArray
								id={field.name}
								name={field.name}
								label={field.label}
								annotation={field.annotation}
								bind:value={field.value}
								placeholder={field.placeholder}
							/>
						{/if}
					{:else if field.type === "CustomObject" && field.name === "imageSaverRules"}
						<ImageSaver
							bind:rules={field.value}
							bind:valid={field.valid}
						/>
					{/if}
				{/each}
			</section>
		{/each}

		<div class="form-buttons">
			<hr />

			<button id="submit" type="button" on:click={handleFormSubmit}>
				{showSavedIndicator ? "Saved" : "Save"}
			</button>

			<button id="reset" type="button" on:click={resetSettings}>
				Reset
			</button>

			<button id="export" type="button" on:click={exportSettings}>
				Export
			</button>

			<button id="import" type="button" on:click={importSettings}>
				Import
			</button>
		</div>
	</form>
{/await}

<style>
	button {
		cursor: pointer;
	}

	button#reset {
		float: right;
	}

	#option-tabs div:hover {
		cursor: pointer;
		background-color: var(--in-content-border-color);
		border-color: var(--in-content-border-color);
	}

	#option-tabs {
		border-top: 1px solid var(--in-content-border-color);
		border-bottom: 1px solid var(--in-content-border-color);
		padding: 0;
		margin: 0;
	}

	#option-tabs div {
		box-sizing: border-box;
		display: inline-block;
		border-top: 2px solid transparent;
		padding: 0.75rem 1rem;
		font-weight: bold;
	}

	.active {
		border-color: var(--in-content-link-color) !important;
		color: var(--in-content-link-color) !important;
	}

	.hidden-section {
		display: none;
	}
</style>
