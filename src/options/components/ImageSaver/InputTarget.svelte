<script lang="ts">
	import {
		createFieldValidator,
		regExpValidator,
		requiredValidator,
		validateRegExp,
	} from "../../utils/inputValidation";
	import InvalidInputNote from "./InvalidInputNote.svelte";

	export let target: string;
	export let onChange: (isValid: boolean) => void;

	const [targetValidity, targetRequired] = createFieldValidator(
		requiredValidator(),
		regExpValidator()
	);
</script>

<input
	type="text"
	bind:value={target}
	use:validateRegExp={target}
	use:targetRequired={target}
	class:field-danger={!$targetValidity.valid}
	class:field-success={$targetValidity.valid}
	on:change={() => onChange($targetValidity.valid)}
	on:blur={() => onChange($targetValidity.valid)}
	name="target[]"
	placeholder="target / regexp"
/>

{#if $targetValidity.dirty && !$targetValidity.valid}
	<InvalidInputNote>
		{$targetValidity.message}
	</InvalidInputNote>
{/if}
