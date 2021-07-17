<script lang="ts">
	import LabelAnnotation from "./LabelAnnotation.svelte";

	export let value: (string | number)[];

	let inputValue = value.map((x) => String(x)).join(", ");

	export let name: string;
	export let id: string;

	export let label: string | undefined;
	export let placeholder: string | undefined;
	export let annotation: string | undefined;

	function onChange(): void {
		value = inputValue
			.split(",")
			.map((x) => x.trim())
			.filter((x) => x !== "");
	}
</script>

<div>
	<label>
		{label}
		<br />
		<input
			bind:value={inputValue}
			on:blur={onChange}
			on:change={onChange}
			{placeholder}
			{id}
			{name}
			type="text"
		/>

		<LabelAnnotation {annotation} />
	</label>
</div>

<style>
	input {
		width: 100%;
	}
</style>
