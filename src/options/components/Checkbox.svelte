<script lang="ts">
	import LabelAnnotation from "./LabelAnnotation.svelte";

	export let checked: boolean = false;
	export let name: string;

	export let id: string = "";
	// export let label: string = "";
	export let annotation: string = "";
</script>

<div>
	<label>
		<input bind:checked {id} {name} type="checkbox" />

		<slot />

		{#if annotation !== ""}
			<br />
			<LabelAnnotation {annotation} />
		{/if}
	</label>
</div>

<style>
	label input {
		cursor: pointer;
	}

	div {
		margin-bottom: 0.5rem;
		margin-top: 0.5rem;
	}
</style>
