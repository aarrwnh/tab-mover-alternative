<script lang="ts">
	import Checkbox from "./components/InputCheckbox.svelte";
	import InputNumber from "./components/InputNumber.svelte";
	import initialize from "./handler/index";

	initialize();
</script>

<div id="main">
	<form>
		<Checkbox
			id={"switchToTabAfterMoving"}
			description={"Switch to active tab after move to another window"}
			extra={"middle clicking on the toolbar icon ignores this options"}
		/>

		<Checkbox
			id={"showLastWindowIDBadge"}
			description={"Show previously active window ID in the badge"}
		/>

		<InputNumber
			id={"tabTravelDistance"}
			description={"Tab travel distance"}
			extra={"set to more than 1 to work"}
			min="0"
			max="10"
		/>

		<InputNumber
			id={"recentTabTimeout"}
			description={"Recent tab timeout (seconds)"}
			extra={"set to more than 1 to work"}
			min="0"
			max="3600"
			step="100"
		/>

		<div class="text-input">
			Always move below containers to a new window:
			<br />

			<table id="identityTable">
				<tr>
					<td>Set:</td>
					<td id="setContainers">
						<input
							type="hidden"
							id="moveableContainers"
							data-option="true"
						/>
					</td>
				</tr>

				<tr>
					<td>Available:</td>
					<td id="availableContainers" />
				</tr>
			</table>
		</div>

		<hr />
		<h2>Bookmarks</h2>

		<div class="text-input">
			Always create subfolder and put bookmarks for the listed
			hostnames/domains:
			<br />
			<input
				id="bookmarkAlwaysToChildFolder"
				type="text"
				data-option="true"
				data-separator=","
			/>
		</div>

		<hr />
		<h2>Image saver</h2>

		<div>**WIP**</div>

		<hr />
		<div>
			<label>
				<input type="checkbox" id="debugMode" data-option="true" />
				debug
			</label>
		</div>

		<div class="form-buttons">
			<button id="submit" type="submit">Save</button>
			<button id="reset" type="button">Reset</button>
		</div>
	</form>
</div>

<style>
	div {
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	/* h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	} */

	@media (min-width: 640px) {
		div {
			max-width: none;
		}
	}
</style>
