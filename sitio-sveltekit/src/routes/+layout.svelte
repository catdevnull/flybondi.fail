<script lang="ts">
	import '../app.css';
	let { children } = $props();

	import cardPath from '$lib/assets/twitter-card.png';

	const title = 'Failbondi - La libertad de NO volar';
	const description =
		'Estadísticas de demoras en vuelos de Flybondi. Mirá cuánto tiempo perdieron los pasajeros.';
	const url = 'https://flybondi.fail';
	import { ModeWatcher } from 'mode-watcher';
</script>

<ModeWatcher />

<svelte:head>
	{#if import.meta.env.PROD}
		<script
			defer
			src="https://umami.experimentos.nulo.ar/script.js"
			data-website-id="e919c6b5-169d-4679-bfcc-f28de2da1b44"
		></script>
	{/if}

	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@esoesnulo" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:url" content={url} />
	<!-- twitter requiere url completa https://leimao.github.io/blog/Missing-Image-Twitter-Card/ -->
	<meta name="twitter:image" content={'https://flybondi.fail' + cardPath} />
</svelte:head>

<div class="min-h-screen bg-white dark:bg-neutral-900 dark:text-neutral-200">
	{@render children()}
</div>
