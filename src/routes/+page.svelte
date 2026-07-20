<script>
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import PageShell from '$lib/PageShell.svelte';

	/** @type {Array<Record<string, any>>} */
	let items = $state([]);
	let loading = $state(true);
	/** @type {string | null} */
	let error = $state(null);

	/** @type {string} */
	let query = $state('');
	/** @type {'sev-desc' | 'sev-asc' | 'planet'} */
	let sort = $state('sev-desc');

	/**
	 * The currently expanded item, or null when the grid is shown.
	 * @type {Record<string, any> | null}
	 */
	let selected = $state(null);

	let filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const list = items.filter((item) => {
			if (!q) return true;
			return (
				String(item.planet ?? '').toLowerCase().includes(q) ||
				String(item.title ?? '').toLowerCase().includes(q)
			);
		});
		const sorted = [...list];
		if (sort === 'sev-desc') sorted.sort((a, b) => b.severity - a.severity);
		else if (sort === 'sev-asc') sorted.sort((a, b) => a.severity - b.severity);
		else sorted.sort((a, b) => String(a.planet).localeCompare(String(b.planet)));
		return sorted;
	});

	onMount(async () => {
		try {
			const res = await fetch(`${base}/data.json`);
			if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
			items = await res.json();
		} catch (/** @type {any} */ e) {
			error = e?.message ?? 'Something went wrong loading the data.';
		} finally {
			loading = false;
		}
	});

	/** @param {Record<string, any>} item */
	function open(item) {
		selected = item;
	}

	function close() {
		selected = null;
	}

	/** @param {KeyboardEvent} e */
	function onKeydown(e) {
		if (e.key === 'Escape') close();
	}

	/** @param {number} severity */
	function severityLabel(severity) {
		const labels = ['Trivial', 'Minor', 'Moderate', 'Serious', 'Severe', 'Critical'];
		return labels[severity - 1] ?? 'Unknown';
	}
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
	<title>Chasm Viewer — Quests</title>
</svelte:head>

<PageShell
	heading="Quests"
	tagline="Hey look it's all the planets"
	{loading}
	{error}
	empty={filtered.length === 0}
>
	{#snippet toolbar()}
		<input
			class="control search"
			type="search"
			placeholder="Search planet or quest…"
			bind:value={query}
		/>
		<label class="sort">
			<span class="sort-label">Sort</span>
			<select class="control" bind:value={sort}>
				<option value="sev-desc">Severity (high → low)</option>
				<option value="sev-asc">Severity (low → high)</option>
				<option value="planet">Planet (A–Z)</option>
			</select>
		</label>
	{/snippet}

	{#each filtered as item (item.id)}
		<button class="card quest-card" onclick={() => open(item)}>
			<h2 class="card-title">{item.planet}</h2>
			<p class="card-quest">{item.title}</p>
			<span class="severity" data-level={item.severity}>
				Severity {item.severity} · {severityLabel(item.severity)}
			</span>
		</button>
	{/each}
</PageShell>

{#if selected}
	<div class="overlay" role="dialog" aria-modal="true" aria-label={selected.title}>
		<!-- Full-screen button behind the panel; clicking it (or pressing Escape) closes the view -->
		<button class="backdrop" aria-label="Close" onclick={close}></button>
		<div class="panel">
			<button class="close" onclick={close} aria-label="Close">×</button>
			<p class="panel-planet">{selected.planet}</p>
			<h2 class="panel-title">{selected.title}</h2>
			<span class="severity" data-level={selected.severity}>
				Severity {selected.severity} · {severityLabel(selected.severity)}
			</span>
			<p class="panel-description">{selected.description}</p>
		</div>
	</div>
{/if}

<style>
	.sort {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sort-label {
		color: #94a3b8;
		font-size: 0.9rem;
	}

	/* Quest cards are interactive buttons, so extend the shared base card. */
	.quest-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.6rem;
		text-align: left;
		color: inherit;
		cursor: pointer;
		font: inherit;
		transition:
			transform 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.quest-card:hover {
		transform: translateY(-3px);
		border-color: #38bdf8;
		box-shadow: 0 10px 30px -12px rgba(56, 189, 248, 0.5);
	}

	.quest-card:focus-visible {
		outline: 2px solid #38bdf8;
		outline-offset: 2px;
	}

	.card-title {
		margin: 0;
		font-size: 1.2rem;
	}

	.card-quest {
		margin: 0;
		color: #cbd5e1;
		font-size: 1rem;
	}

	.severity {
		display: inline-block;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 600;
		border: 1px solid currentColor;
		color: #94a3b8;
	}

	.severity[data-level='1'] {
		color: #4ade80;
	}
	.severity[data-level='2'] {
		color: #a3e635;
	}
	.severity[data-level='3'] {
		color: #facc15;
	}
	.severity[data-level='4'] {
		color: #fb923c;
	}
	.severity[data-level='5'] {
		color: #f87171;
	}
	.severity[data-level='6'] {
		color: #ef4444;
	}

	.overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		z-index: 10;
		animation: fade 0.15s ease;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		border: none;
		padding: 0;
		background: rgba(2, 6, 23, 0.8);
		backdrop-filter: blur(4px);
		cursor: pointer;
	}

	.panel {
		position: relative;
		z-index: 1;
		width: min(900px, 100%);
		max-height: 90vh;
		overflow-y: auto;
		background: #0b1424;
		border: 1px solid #1e293b;
		border-radius: 18px;
		padding: 3rem clamp(1.5rem, 5vw, 3.5rem);
		box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6);
		animation: pop 0.15s ease;
	}

	.panel-planet {
		margin: 0 0 0.25rem;
		color: #38bdf8;
		font-size: 0.95rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.panel-title {
		margin: 0 0 1rem;
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		letter-spacing: -0.02em;
	}

	.panel .severity {
		margin-bottom: 1.25rem;
	}

	.panel-description {
		margin: 0;
		font-size: 1.15rem;
		line-height: 1.7;
		color: #cbd5e1;
	}

	.close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 2.5rem;
		height: 2.5rem;
		border: none;
		border-radius: 50%;
		background: #1e293b;
		color: #e2e8f0;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.close:hover {
		background: #334155;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
