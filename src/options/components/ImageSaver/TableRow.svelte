<script lang="ts">
	import InputFindLargestTarget from "./InputFindLargestTarget.svelte";
	import InputSaveFolder from "./InputSaveFolder.svelte";
	import InputTarget from "./InputTarget.svelte";
	import Checkbox from "../Checkbox.svelte";

	export let target: string;
	export let folder: string;
	export let disabled: boolean;
	export let findLargest: boolean;
	export let findLargestTarget: string;
	export let onRemove: () => void;
	export let onChange: (isValid: boolean) => void;

	function handleRemove(): void {
		if (onRemove) {
			onRemove();
		}
	}

	function handleValidState(isValid: boolean): void {
		if (onChange) {
			onChange(isValid);
		}
	}

	$: findLargestTarget = findLargest ? findLargestTarget : "";
</script>

<tr>
	<td colspan="2">
		<Checkbox bind:checked={disabled} name="disabled[]">disabled</Checkbox>
		<Checkbox bind:checked={findLargest} name="findLargest[]">
			use save largest method
		</Checkbox>
	</td>
</tr>

<tr>
	<td>
		<InputTarget bind:target onChange={handleValidState} />
	</td>

	<td>
		<button on:click|preventDefault={handleRemove}>Remove</button>
	</td>
</tr>

<tr>
	<td>
		<InputSaveFolder bind:folder onChange={handleValidState} />
	</td>
</tr>

{#if findLargest}
	<tr>
		<td>
			<InputFindLargestTarget bind:findLargestTarget onChange={handleValidState} />
		</td>
	</tr>
{/if}
