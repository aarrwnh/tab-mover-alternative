<script lang="ts">
	import {
		createFieldValidator,
		pathValidator,
		requiredValidator,
		validatePath,
	} from "../../utils/inputValidation";
	import InvalidInputNote from "./InvalidInputNote.svelte";

	export let folder: string;
	export let onChange: (isValid: boolean) => void;

	const [requirePathValidity, pathRequired] = createFieldValidator(
		requiredValidator(),
		pathValidator()
	);
</script>

Relative save folder:
<input
	type="text"
	bind:value={folder}
	use:validatePath={folder}
	use:pathRequired={folder}
	class:field-danger={!$requirePathValidity.valid}
	class:field-success={$requirePathValidity.valid}
	on:change={() => onChange($requirePathValidity.valid)}
	on:blur={() => onChange($requirePathValidity.valid)}
	name="folder[]"
	placeholder="save folder"
/>

{#if $requirePathValidity.dirty && !$requirePathValidity.valid}
	<InvalidInputNote>
		{$requirePathValidity.message}
	</InvalidInputNote>
{/if}

<small>Use $n; (n=1, 2, ..., n) to refer to matched group of the target URL</small>
