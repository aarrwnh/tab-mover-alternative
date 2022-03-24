<script lang="ts">
	export let annotation: string | undefined;
</script>

{#if annotation}
	<i>{annotation}</i>
{/if}
