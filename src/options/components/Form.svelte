<script lang="ts">
	import type { TSettings } from "../types/FormElements";
	import Checkbox from "./Checkbox.svelte";
	import ImageSaver from "./ImageSaver/index.svelte";
	import Input from "./Input.svelte";
	import InputArray from "./InputArray.svelte";
	import Range from "./Range.svelte";
	import MultiAccountContainer from "./MultiAccountContainers.svelte";

	export let onSubmit: FormChangeCallback = undefined;
	export let onChange: FormChangeCallback = undefined;
	export let formFieldValues: TSettings;

	let showSavedIndicator = false;

	function parseFieldsToObject(fields: TSettings): Addon.Settings | void {
		let parsedSettings: Addon.Settings = Object.create({});

		for (const section of Object.values(fields)) {
			for (let idx = 0; idx < section.opts.length; idx++) {
				let { name, value, valid } = section.opts[idx];

				if (!valid) return;

				if (name === "imageSaverRules") {
					value = (value as Addon.ImageSaverRule[]).filter(function (x) {
						return !(x.folder === "" || x.target === "");
					});

					// fix object
					value.forEach((item) => {
						Object.assign(
							{ findLargestTarget: "", findLargest: false, disabled: false },
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
		const json = JSON.stringify(parseFieldsToObject(formFieldValues), null, 2);
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

	function resetSettings(ev: Event) {
		(ev.target as HTMLButtonElement).textContent = "TODO";
	}
</script>

{#await getStorage()}
	...
{:then _}
	<form
		on:change|preventDefault={handleFormChange}
		on:submit|preventDefault={handleFormSubmit}
	>
		{#each Object.entries(formFieldValues) as [sectionName, formSection]}
			<section data-name={sectionName}>
				<h2>{formSection.title}</h2>
				{#each formSection.opts as field}
					{#if field.type === "Checkbox"}
						<Checkbox
							id={field.name}
							name={field.name}
							label={field.label}
							annotation={field.annotation}
							bind:checked={field.value}
						/>
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
						<ImageSaver bind:rules={field.value} bind:valid={field.valid} />
					{/if}
				{/each}
			</section>
		{/each}
		<div class="form-buttons">
			<hr />
			<button id="submit" type="button" on:click={handleFormSubmit}>
				{showSavedIndicator ? "Saved" : "Save"}
			</button>
			<button style="float: right;" id="reset" type="button" on:click={resetSettings}>
				Reset
			</button>
			<button id="export" type="button" on:click={exportSettings}>Export</button>
		</div>
	</form>
{/await}

<style>
	button {
		cursor: pointer;
	}
</style>
