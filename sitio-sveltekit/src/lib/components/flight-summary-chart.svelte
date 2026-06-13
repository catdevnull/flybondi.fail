<script lang="ts">
	import { COLOR_CLASSES, getDelayColor } from '$lib/colors';
	import Icon from '$lib/components/icon.svelte';

	type DisplayFlight = {
		delta: number;
		atda?: Date | string | null;
		json: {
			nro: string;
			estes?: string;
		};
	};

	export let flights: DisplayFlight[];
	export let delayedFlights: DisplayFlight[];
	export let cancelledFlights: DisplayFlight[];
	export let containerClass =
		'flex flex-col items-center justify-center gap-4 rounded-lg border bg-neutral-50 p-4 text-xl dark:border-neutral-700 dark:bg-neutral-800';
</script>

<div class={containerClass}>
	<div class="grid grid-cols-9 gap-2">
		{#each flights as flight}
			{#if flight.atda}
				<Icon
					class="h-8 w-8 {getDelayColor(flight.delta)}"
					icon="fa6-solid-plane"
					aria-label="Vuelo {flight.json.nro} con {flight.delta / 60} minutos de retraso"
				/>
			{:else if flight.json.estes === 'Cancelado'}
				<Icon
					class="h-8 w-8 text-neutral-700 dark:text-neutral-300"
					icon="fa6-solid-plane-slash"
					aria-label="Vuelo {flight.json.nro} cancelado"
				/>
			{/if}
		{/each}
	</div>
	<p class="text-center">
		<span class="font-bold"
			>De {flights.length} vuelos, {delayedFlights.length} tardaron mas de 30 minutos en despegar{#if cancelledFlights.length > 0}
				{' '}y
				{cancelledFlights.length} vuelo{cancelledFlights.length > 1
					? 's fueron cancelados'
					: ' fue cancelado'}.
			{:else}.
			{/if}
		</span>
	</p>
	<div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
		<div class="flex items-center gap-1">
			<Icon class="size-4 text-neutral-700 dark:text-neutral-300" icon="fa6-solid-plane-slash" />
			<span>Cancelado</span>
		</div>
		<div class="flex items-center gap-1">
			<Icon class="size-4 text-[#b10000]" icon="fa6-solid-plane" />
			<span>mas de 45min</span>
		</div>
		<div class="flex items-center gap-1">
			<Icon class="size-4 {COLOR_CLASSES[45 * 60]}" icon="fa6-solid-plane" />
			<span>45-30min</span>
		</div>
		<div class="flex items-center gap-1">
			<Icon class="size-4 {COLOR_CLASSES[30 * 60]}" icon="fa6-solid-plane" />
			<span>30-15min</span>
		</div>
		<div class="flex items-center gap-1">
			<Icon class="size-4 {COLOR_CLASSES[15 * 60]}" icon="fa6-solid-plane" />
			<span>15-0min</span>
		</div>
	</div>
</div>
