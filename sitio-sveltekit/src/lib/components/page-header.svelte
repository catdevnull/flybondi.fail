<script lang="ts">
	export let subtitle: string = '';
</script>

<div
	class="sticky top-0 z-10 mb-4 flex flex-col border-b bg-white px-1 pb-3 text-center sm:px-4 dark:border-neutral-700 dark:bg-neutral-900"
>
	<h1 class="flex items-end justify-center">
		<a href="/" class="text-4xl font-medium leading-none text-red-600 hover:underline"
			>failbondi.fail</a
		>
	</h1>
	{#if subtitle}
		<div class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
			{subtitle}
		</div>
	{/if}
	<slot />
</div>
