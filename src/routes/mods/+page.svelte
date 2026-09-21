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

	/**
	 * Friendly names for the known keys in a `bonuses` object. Anything else is
	 * humanized from its camelCase key so new stats render without a code change.
	 * @type {Record<string, string>}
	 */
	const STAT_LABELS = {
		ac: 'AC',
		saves: 'Saves',
		attack: 'Attack',
		damage: 'Damage',
		spellAttack: 'Spell Attack',
		spellDamage: 'Spell Damage'
	};

	/**
	 * Flatten an item's `bonuses` into label/value pairs for display. Values are
	 * signed, since every bonus reads as a modifier (e.g. "AC +3").
	 * @param {Record<string, any>} item
	 */
	function statsOf(item) {
		const bonuses = item.bonuses;
		if (!bonuses || typeof bonuses !== 'object') return [];
		return Object.entries(bonuses)
			.filter(([, value]) => Number(value) !== 0 && value !== null && value !== '')
			.map(([key, value]) => {
				const label =
					STAT_LABELS[key] ??
					key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
				const n = Number(value);
				return { key, label, value: Number.isFinite(n) ? `${n > 0 ? '+' : ''}${n}` : String(value) };
			});
	}

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
				<!-- Mods aren't unique, so identical ones are stored once with a count. -->
				{#if Number(item.quantity ?? 1) > 1}
					<span class="type count">×{Number(item.quantity)}</span>
				{/if}
			</div>
			{#if statsOf(item).length > 0}
				<dl class="stats">
					{#each statsOf(item) as stat (stat.key)}
						<div class="stat">
							<dt>{stat.label}</dt>
							<dd>{stat.value}</dd>
						</div>
					{/each}
				</dl>
			{/if}
			{#if item.effect}
				<p class="card-effect">{item.effect}</p>
			{/if}
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

	.count {
		background: rgba(74, 222, 128, 0.15);
		color: #4ade80;
		font-variant-numeric: tabular-nums;
	}

	.owner {
		background: rgba(251, 191, 36, 0.15);
		color: #fbbf24;
		text-transform: none;
		letter-spacing: 0;
	}

	/* Stat values from `bonuses`: one bordered cell per stat, wrapping in place. */
	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0;
		max-width: 100%;
	}

	.stat {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		padding: 0.2rem 0.55rem;
		border: 1px solid #1e293b;
		border-radius: 8px;
		background: #0b1424;
	}

	.stat dt {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
	}

	.stat dd {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: #e2e8f0;
	}

	.card-effect {
		margin: 0;
		color: #94a3b8;
		line-height: 1.55;
	}
</style>
