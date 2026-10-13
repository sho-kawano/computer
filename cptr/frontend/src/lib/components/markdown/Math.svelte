<script lang="ts">
	import katex from 'katex';
	import 'katex/dist/katex.min.css';

	let { text, displayMode = false }: { text: string; displayMode?: boolean } = $props();
	let html = $derived.by(() => {
		try {
			return katex.renderToString(text, { displayMode, throwOnError: false, trust: false });
		} catch {
			return null;
		}
	});
</script>

<span class:display-math={displayMode} class="not-prose">
	{#if html !== null}{@html html}{:else}{text}{/if}
</span>

<style>
	.display-math {
		display: block;
		overflow-x: auto;
		max-width: 100%;
		margin: 0.75rem 0;
	}
	.display-math :global(.katex-display) {
		margin: 0;
		padding: 0.25rem 0;
	}
</style>
