<script lang="ts">
	import Form from "./components/Form.svelte";
	import { defaultFormFieldValues } from "./handler/defaultFieldValues";
	import { debounce } from "./helpers/debounce";

	let idx = 0;
	let result: Addon.Settings = Object.create(null);

	const onChange: FormChangeCallback = function (body) {
		const settings = body();
		if (settings) {
			result = settings;
			console.log("changed:", idx++);
		}
	};
</script>

<div id="main">
	<Form
		onSubmit={onChange}
		onChange={debounce(1000, onChange)}
		formFieldValues={defaultFormFieldValues}
	/>

	{#if result.debugMode}
		<pre>
			<code>{JSON.stringify(result, null, 2)}</code>
		</pre>
	{/if}
</div>

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
	}

	div {
		padding: 1em;
		width: 100%;
		margin: 0 auto;
	}

	@media (min-width: 680px) {
		div {
			max-width: none;
		}
	}
</style>
