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

	/**
	 * MMO-style rarity ladder, lowest grade first. The index into this array is
	 * the grade, so a new tier is just another entry plus its colour in the css.
	 */
	const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

	/** Bonuses totalling this much sit at the bottom of the ladder. */
	const BASE_TOTAL = 6;
	/** Every this many points above the base is one grade up. */
	const TOTAL_PER_GRADE = 2;
	/** Carrying a bonus effect is worth a grade on its own. */
	const EFFECT_GRADE_BONUS = 1;

	/**
	 * Sum of every numeric bonus on an item, the raw input to its grade.
	 * @param {Record<string, any>} item
	 */
	function statTotal(item) {
		const bonuses = item.bonuses;
		if (!bonuses || typeof bonuses !== 'object') return 0;
		return Object.values(bonuses).reduce((sum, value) => sum + (Number(value) || 0), 0);
	}

	/**
	 * Grade an item from its stat total, where a bonus effect counts as one extra
	 * grade. Clamped to the ends of the ladder.
	 * @param {Record<string, any>} item
	 */
	function rarityOf(item) {
		const total = statTotal(item);
		const hasEffect = String(item.effect ?? '').trim().length > 0;
		// Floor the stat-derived grade before adding the effect bump, so a weak stat
		// line can't cancel out the bump an effect is meant to guarantee.
		const fromStats = Math.max(0, Math.floor((total - BASE_TOTAL) / TOTAL_PER_GRADE));
		const index = Math.min(
			RARITIES.length - 1,
			fromStats + (hasEffect ? EFFECT_GRADE_BONUS : 0)
		);
		return { index, name: RARITIES[index], total, hasEffect };
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

	/**
	 * Broad gear groups, in the order they should appear. Anything unrecognised
	 * falls to the end under 'Other'.
	 */
	const GROUP_ORDER = ['Weapon', 'Armor', 'Focus', 'Accessory', 'Other'];

	/**
	 * Bucket an item by what it is worn or swung as, derived from its subtype so
	 * the json stays free of a redundant group field.
	 * @param {Record<string, any>} item
	 */
	function groupOf(item) {
		if (item.type === 'Accessory') return 'Accessory';
		const subtype = String(item.subtype ?? '');
		if (/armor|armorless/i.test(subtype)) return 'Armor';
		if (/weapon/i.test(subtype)) return 'Weapon';
		if (/staff|focus/i.test(subtype)) return 'Focus';
		return 'Other';
	}

	// Ordering runs group, then subtype label, then rarity best-first, so the list
	// reads as a gear locker rather than a flat pile.
	let sorted = $derived.by(() =>
		[...filtered].sort((a, b) => {
			const byGroup = GROUP_ORDER.indexOf(groupOf(a)) - GROUP_ORDER.indexOf(groupOf(b));
			if (byGroup !== 0) return byGroup;
			const bySubtype = String(a.subtype ?? '').localeCompare(String(b.subtype ?? ''));
			if (bySubtype !== 0) return bySubtype;
			const byGrade = rarityOf(b).index - rarityOf(a).index;
			if (byGrade !== 0) return byGrade;
			// Within a grade, the bigger stat line wins, then fall back to the title.
			const byTotal = statTotal(b) - statTotal(a);
			if (byTotal !== 0) return byTotal;
			return String(a.title).localeCompare(String(b.title));
		})
	);

</script>

<svelte:head>
	<title>Chasm Viewer — Mods</title>
</svelte:head>

<PageShell
	heading="Mods & Accessories"
	tagline="Gear up before you descend."
	loading={data.loading}
	error={data.error}
	empty={sorted.length === 0}
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

	{#each sorted as item (item.id)}
		{@const rarity = rarityOf(item)}
		<article class="card mod-card" data-rarity={rarity.name}>
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
				<!-- Grade is derived from the stat total, so it always matches the
				     numbers shown below rather than a field that can drift. -->
				<span class="type rarity">{rarity.name}</span>
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

	/* Grade colours follow the usual mmo ladder: grey, green, blue, purple,
	   orange. Each card exposes its grade as --rarity so the border, title and
	   chip all tint from one value. */
	.mod-card[data-rarity='Common'] {
		--rarity: #94a3b8;
	}
	.mod-card[data-rarity='Uncommon'] {
		--rarity: #4ade80;
	}
	.mod-card[data-rarity='Rare'] {
		--rarity: #38bdf8;
	}
	.mod-card[data-rarity='Epic'] {
		--rarity: #a78bfa;
	}
	.mod-card[data-rarity='Legendary'] {
		--rarity: #fb923c;
	}

	.mod-card {
		--rarity: #94a3b8;
		border-color: color-mix(in srgb, var(--rarity) 45%, transparent);
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
		color: var(--rarity);
	}

	.rarity {
		background: color-mix(in srgb, var(--rarity) 18%, transparent);
		color: var(--rarity);
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
