<script>
	import PageShell from '$lib/PageShell.svelte';
	import { jsonResource } from '$lib/jsonResource.svelte.js';

	const data = jsonResource('mods.json');
	let items = $derived(data.items);

	/** @type {string} */
	let query = $state('');
	/**
	 * Accessories are unique, owned items rather than shared stock, so the list
	 * opens on mods (weapons/armor) only; picking another type reveals them.
	 * @type {'All' | 'Mod' | 'Accessory'}
	 */
	let typeFilter = $state('Mod');
	/** @type {string} */
	let subtypeFilter = $state('All');

	// Subcategories come from the data itself, so new kinds show up without code
	// changes. They are scoped to the active type so hidden types don't offer
	// categories that can only ever return nothing.
	let subtypes = $derived([
		...new Set(
			items
				.filter((item) => typeFilter === 'All' || item.type === typeFilter)
				.map((item) => String(item.subtype ?? ''))
				.filter(Boolean)
		)
	].sort());

	// Switching type can strip the chosen category from the options above; drop
	// back to All so the select never shows a value it no longer contains.
	$effect(() => {
		if (subtypeFilter !== 'All' && !subtypes.includes(subtypeFilter)) subtypeFilter = 'All';
	});

	let filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return items.filter((item) => {
			if (typeFilter !== 'All' && item.type !== typeFilter) return false;
			if (subtypeFilter !== 'All' && item.subtype !== subtypeFilter) return false;
			if (!q) return true;
			return (
				String(item.title ?? '').toLowerCase().includes(q) ||
				String(item.subtype ?? '').toLowerCase().includes(q) ||
				String(item.owner ?? '').toLowerCase().includes(q) ||
				String(item.effect ?? '').toLowerCase().includes(q)
			);
		});
	});

</script>

<svelte:head>
	<title>Chasm Viewer — Mods</title>
</svelte:head>

<PageShell
	heading="Mods & Accessories"
	tagline="Gear up before you descend."
	loading={data.loading}
	error={data.error}
	empty={filtered.length === 0}
>
	{#snippet toolbar()}
		<input
			class="control search"
			type="search"
			placeholder="Search title or effect…"
			bind:value={query}
		/>
		<label class="filter">
			<span class="filter-label">Type</span>
			<select class="control" bind:value={typeFilter}>
				<option value="All">All</option>
				<option value="Mod">Mod</option>
				<option value="Accessory">Accessory</option>
			</select>
		</label>
		<label class="filter">
			<span class="filter-label">Category</span>
			<select class="control" bind:value={subtypeFilter}>
				<option value="All">All</option>
				{#each subtypes as subtype (subtype)}
					<option value={subtype}>{subtype}</option>
				{/each}
			</select>
		</label>
	{/snippet}

	{#each filtered as item (item.id)}
		<article class="card mod-card">
			<h2 class="card-title">{item.title}</h2>
			<!-- Chips sit on their own row so a long title can never squeeze them, and
			     they wrap inside the card instead of overflowing it. -->
			<div class="tags">
				<!-- `owner` is optional and only meaningful for accessories, which are
				     unique; mods (weapons/armor) are interchangeable and have no owner. -->
				{#if item.type === 'Accessory' && item.owner}
					<span class="type owner">{item.owner}</span>
				{/if}
				{#if item.subtype}
					<span class="type subtype">{item.subtype}</span>
				{/if}
				<span class="type" data-type={item.type}>{item.type}</span>
			</div>
			<p class="card-effect">{item.effect}</p>
		</article>
	{/each}
</PageShell>

<style>
	.filter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-label {
		color: #94a3b8;
		font-size: 0.9rem;
	}

	.mod-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.6rem;
		/* The card is a grid item, so cap its content to keep chips inside it. */
		min-width: 0;
	}

	.card-title {
		margin: 0;
		font-size: 1.15rem;
		max-width: 100%;
		overflow-wrap: anywhere;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		max-width: 100%;
	}

	.type {
		padding: 0.2rem 0.6rem;
		max-width: 100%;
		overflow-wrap: anywhere;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: #1e293b;
		color: #94a3b8;
	}

	.type[data-type='Mod'] {
		background: rgba(56, 189, 248, 0.15);
		color: #38bdf8;
	}

	.type[data-type='Accessory'] {
		background: rgba(167, 139, 250, 0.15);
		color: #a78bfa;
	}

	.subtype {
		background: #1e293b;
		color: #cbd5e1;
		text-transform: none;
		letter-spacing: 0;
		font-weight: 500;
	}

	.owner {
		background: rgba(251, 191, 36, 0.15);
		color: #fbbf24;
		text-transform: none;
		letter-spacing: 0;
	}

	.card-effect {
		margin: 0;
		color: #94a3b8;
		line-height: 1.55;
	}
</style>
