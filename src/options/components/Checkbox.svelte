<script lang="ts">
	import LabelAnnotation from "./LabelAnnotation.svelte";

	export let checked: boolean;
	export let name: string;
	export let id: string;

	export let label: string | undefined;
	export let annotation: string | undefined;
</script>

<div>
	<label>
		<input bind:checked {id} {name} type="checkbox" />

		{label}

		<br />

		<LabelAnnotation {annotation} />
	</label>
</div>

<style>
	div {
		border-bottom: 1px solid rgb(75, 75, 75);
	}
</style>
