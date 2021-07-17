<script lang="ts">
	import LabelAnnotation from "./LabelAnnotation.svelte";

	export let value: string | number;

	export let name: string;
	export let id: string;

	export let label: string | undefined;
	export let placeholder: string | undefined;
	export let annotation: string | undefined;
</script>

<div>
	<label>
		{label}
		<br />
		<input bind:value {placeholder} {id} {name} type="text" />

		<LabelAnnotation {annotation} />
	</label>
</div>

<style>
	input {
		width: 100%;
	}
</style>
