<script lang="ts">
	import { createFieldValidator, regExpValidator } from "../../utils/inputValidation";
	import InvalidInputNote from "./InvalidInputNote.svelte";

	export let findLargestTarget: string;
	export let onChange: (isValid: boolean) => void;

	const [targetLargestValidity, targetLargestRequired] = createFieldValidator(
		regExpValidator()
	);
</script>

Find Largest Target:
<input
	type="text"
	bind:value={findLargestTarget}
	use:targetLargestRequired={findLargestTarget}
	class:field-danger={!$targetLargestValidity.valid}
	class:field-success={$targetLargestValidity.valid}
	on:change={() => onChange($targetLargestValidity.valid)}
	on:blur={() => onChange($targetLargestValidity.valid)}
	name="findLargestTarget[]"
	placeholder="findLargestTarget"
/>

<small>
	* RegExp tag will further filter the matched URLs
	<br />
	Valid examples:
	<br />
	- &lt;XPath attribute="href"&gt;//div[@role="presentation"]/a&lt;/XPath&gt; &lt;RegExp&gt;#user=(.+)&lt;/RegExp&gt;
	<br />
	- &lt;XPath&gt;//div/img&lt;/XPath&gt; &lt;RegExp&gt;/RegExp&gt; -- will find all img elements
	<br />
	- http://example.com/\d+.jpg -- just a RegExp will look for string matches on whole page
</small>

{#if $targetLargestValidity.dirty && !$targetLargestValidity.valid}
	<InvalidInputNote>
		{$targetLargestValidity.message}
	</InvalidInputNote>
{/if}
