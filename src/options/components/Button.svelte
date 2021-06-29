<script lang="ts">
	export let value: string;
	function handleClick() {}
</script>

<button on:click={handleClick}>
	{value}
</button>

<style>
	button {
		border: 2px solid red;
	}
</style>
