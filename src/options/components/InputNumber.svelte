<script lang="ts">
	export let id: string;
	export let description: string;
	export let extra: string;
	export let min: string = "0";
	export let max: string;
	export let step: string = "1";
	export let value: number = 0;
</script>

<div>
	<label>
		{description}:

		<input type="number" bind:value {id} {min} {max} data-option="true" />

		<input type="range" bind:value {min} {max} {step} />

		{#if extra}
			<i>({extra})</i>
		{/if}
	</label>
</div>

<style>
	div {
		border: 2px solid blue;
	}
</style>
