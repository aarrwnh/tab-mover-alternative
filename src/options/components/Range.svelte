<script lang="ts">
	import LabelAnnotation from "./LabelAnnotation.svelte";

	export let value: number;
	export let name: string;
	export let id: string;
	export let min: number;
	export let max: number;
	export let step: number;

	export let label: string | undefined;
	export let annotation: string | undefined;
</script>

<div class="range">
	<label for={name}>
		{label}
		<div>
			<input type="number" bind:value {name} {id} {min} {max} />
			<br />
			<input type="range" bind:value {min} {max} {step} />
		</div>

		<LabelAnnotation {annotation} />
	</label>
</div>

<style>
	.range {
		border-bottom: 1px solid rgb(75, 75, 75);
	}

	input[type="range"] {
		width: 100%;
	}

	.range div {
		margin: auto;
		width: 100%;
		padding: 10px;
	}
</style>
