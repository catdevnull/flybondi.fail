<script lang="ts">
	import '../app.css';
	let { children } = $props();
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
</svelte:head>

<div class="min-h-screen bg-white dark:bg-neutral-900 dark:text-neutral-200">
	{@render children()}
</div>

<svg
	xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink"
	style="position: absolute; width: 0; height: 0;"
>
	<defs>
		<symbol viewBox="0 0 576 512" id="fa6-solid-plane">
			<path
				fill="currentColor"
				d="M482.3 192c34.2 0 93.7 29 93.7 64c0 36-59.5 64-93.7 64H365.7L265.2 495.9c-5.7 10-16.3 16.1-27.8 16.1h-56.2c-10.6 0-18.3-10.2-15.4-20.4l49-171.6H112l-43.2 57.6c-3 4-7.8 6.4-12.8 6.4H14c-7.8 0-14-6.3-14-14c0-1.3.2-2.6.5-3.9L32 256L.5 145.9c-.4-1.3-.5-2.6-.5-3.9c0-7.8 6.3-14 14-14h42c5 0 9.8 2.4 12.8 6.4L112 192h102.9l-49-171.6c-3-10.2 4.7-20.4 15.3-20.4h56.2c11.5 0 22.1 6.2 27.8 16.1L365.7 192z"
			></path></symbol
		>
		<symbol viewBox="0 0 640 512" id="fa6-solid-plane-slash"
			><path
				fill="currentColor"
				d="M514.3 192c34.2 0 93.7 29 93.7 64c0 36-59.5 64-93.7 64h-73.8l190.3 149.1c10.4 8.2 12.3 23.3 4.1 33.7s-23.3 12.3-33.7 4.1l-592-464C-1.2 34.7-3.1 19.6 5.1 9.2S28.4-3.1 38.8 5.1l199.3 156.2l-40.3-140.9C194.9 10.2 202.6 0 213.2 0h56.2c11.5 0 22.1 6.2 27.8 16.1L397.7 192zM41.5 128.7l321 252.9l-65.3 114.3c-5.7 10-16.3 16.1-27.8 16.1h-56.2c-10.6 0-18.3-10.2-15.4-20.4l49-171.6H144l-43.2 57.6c-3 4-7.8 6.4-12.8 6.4H46c-7.8 0-14-6.3-14-14c0-1.3.2-2.6.5-3.9L64 256L32.5 145.9c-.4-1.3-.5-2.6-.5-3.9c0-6.2 4-11.4 9.5-13.3"
			></path></symbol
		>

		<symbol viewBox="0 0 24 24" id="grommet-icons-info"
			><path
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				d="M15 17c0-3 4-5 4-9s-3-7-7-7s-7 3-7 7s4 6 4 9v3q0 3 3 3t3-3zm-6 1h6"
			></path></symbol
		>

		<symbol viewBox="0 0 24 24" id="lucide-plane-takeoff"
			><path
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M2 22h20M6.36 17.4L4 17l-2-4l1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12L5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.4 2.4 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"
			></path></symbol
		>
	</defs>
</svg>
