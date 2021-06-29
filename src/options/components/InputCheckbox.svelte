<script lang="ts">
	export let id: string;
	export let description: string;
	export let extra: string = "";

	$: checked = false;

	function handleClick() {
		console.log(checked);
		setTimeout(() => {
			console.log(checked);
		}, 1000);
	}
</script>

<div>
	<label>
		<input
			type="checkbox"
			bind:checked
			{id}
			data-option="true"
			on:click={handleClick}
		/>

		{description}

		<br />

		{#if extra}
			<i>({extra})</i>
		{/if}
	</label>
</div>

<style>
	div {
		border: 2px solid pink;
	}
</style>
