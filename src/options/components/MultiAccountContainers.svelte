<script lang="ts">
	export let value: (string | number)[];

	let selected: { [cookie: string]: boolean } = {};

	async function loadContextualIdentities(): Promise<
		browser.contextualIdentities.ContextualIdentity[]
	> {
		const identities = await browser.contextualIdentities.query({});

		for (const { cookieStoreId } of identities) {
			selected[cookieStoreId] = value.includes(cookieStoreId);
		}

		return identities;
	}

	function refreshOnIdentityStateChange(cookieStoreId: string): void {
		const idx = value.indexOf(cookieStoreId);
		if (idx === -1) {
			value.push(cookieStoreId);
		} else {
			value.splice(idx, 1);
		}
		value = value;
	}
</script>

Always move selected containers to a new window:

<br />

{#await loadContextualIdentities()}
	<p>...</p>
{:then identities}
	{#each identities as identity}
		<span
			title={identity.cookieStoreId}
			class={"available-container" +
				(selected[identity.cookieStoreId] ? " selected" : "")}
			style={`--color-code: ${identity.colorCode}; --color-code-dim: ${identity.colorCode}55; --icon-url: ${identity.iconUrl}`}
		>
			<label>
				<input
					type="checkbox"
					bind:checked={selected[identity.cookieStoreId]}
					on:change={() => {
						refreshOnIdentityStateChange(identity.cookieStoreId);
					}}
				/>

				<img class="container-icon" src={identity.iconUrl} alt={identity.name} />

				{identity.name}
			</label>
		</span>
	{/each}
{/await}

<style>
	.available-container {
		display: inline-flex;
		border: 1px solid var(--identity-border-color);
		border-radius: 3px;
		cursor: pointer;
		padding: 0;
		margin-top: 4px;
		margin-right: 4px;
		clear: none;
		height: 2.6em;
		--identity-icon: var(--icon-url);
		--identity-border-color-hover: var(--color-code);
		--identity-border-color: var(--color-code-dim);
	}

	.available-container.selected {
		background-color: var(--color-code-dim);
	}

	.available-container label {
		padding: 6px 10px;
	}

	.available-container:hover {
		border-color: var(--identity-border-color-hover);
	}

	.available-container .container-icon {
		background-image: var(--identity-icon);
		background-size: 16px;
		filter: url("filters.svg#fill");
		fill: var(--identity-border-color-hover);
		width: 16px;
		height: 16px;
		margin: 0px 6px 0px 0;
	}

	span > label > input {
		display: none;
	}
</style>
