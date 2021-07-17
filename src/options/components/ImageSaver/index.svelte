<script lang="ts">
	import ImageSaverTableRow from "./TableRow.svelte";
	import { defaultImageSaverRuleObject } from "../../handler/defaultFieldValues";

	export let rules: Addon.ImageSaverRule[];
	export let valid: boolean = true;

	function handleAddNewRule() {
		const newRow = Object.create(defaultImageSaverRuleObject);
		newRow.idx = rules.length > 0 ? rules[rules.length - 1].idx + 1 : 0;
		rules = rules.concat(newRow);
	}
</script>

<div>
	Rules:
	<button on:click|preventDefault={handleAddNewRule}> + Add New Rule </button>

	<table>
		<thead>
			<td>Regular expression</td>
			<td>Actions</td>
		</thead>

		{#each rules as rule, id}
			<tr>
				<td colspan="2"><hr /></td>
			</tr>
			<ImageSaverTableRow
				bind:target={rule.target}
				bind:disabled={rule.disabled}
				bind:folder={rule.folder}
				bind:findLargest={rule.findLargest}
				bind:findLargestTarget={rule.findLargestTarget}
				onRemove={() => {
					rules.splice(id, 1);
					rules = rules;
				}}
				onChange={(isValid) => {
					valid = isValid;
				}}
			/>
		{/each}
	</table>
</div>

<style>
	table td:nth-child(1) {
		width: 80vw;
	}

	table {
		border-collapse: collapse;
		width: 100%;
	}
</style>
