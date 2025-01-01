<script lang="ts">
	import { formatDuration, intervalToDuration } from 'date-fns';
	import { es } from 'date-fns/locale/es';
	import dayjs from 'dayjs';
	import airports from '$lib/aerolineas-airports.json';
	import type { Vuelo } from './+page.server';

	export let data;
	const { vuelos } = data;

	function delayString(vuelo: Vuelo) {
		const delayed = vuelo.delta > 0;
		const shorter = (s: string) =>
			s.replace(' horas', 'hs').replace(' hora', 'h').replace(' minutos', 'min');
		if (delayed) {
			return shorter(
				'atrasado ' +
					formatDuration(
						intervalToDuration({
							start: new Date(vuelo.stda),
							end: new Date(vuelo.atda)
						}),
						{ locale: es }
					)
			);
		} else
			return shorter(
				'adelantado ' +
					formatDuration(
						intervalToDuration({
							start: new Date(vuelo.atda),
							end: new Date(vuelo.stda)
						}),
						{ locale: es }
					)
			);
	}

	const timeFormatter = Intl.DateTimeFormat('es-AR', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone: 'America/Argentina/Buenos_Aires'
	});

	const dateFormatter = Intl.DateTimeFormat('es-AR', {
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone: 'America/Argentina/Buenos_Aires'
	});

	function formatDateTime(timestamp: string) {
		const date = dayjs();
		const dateObj = new Date(timestamp);
		return date.isSame(dateObj, 'day')
			? timeFormatter.format(dateObj)
			: dateFormatter.format(dateObj);
	}

	const getAirport = (iata: string) => {
		const airport = airports.data.find((a) => a.iata === iata);
		return airport ? airport.alias : iata;
	};

	function getDelayColor(delay: number) {
		if (delay <= 0) return 'text-green-600 dark:text-green-400';
		if (delay < 10 * 60) return 'text-green-500 dark:text-green-400';
		if (delay < 60 * 60) return 'text-yellow-600 dark:text-yellow-400';
		if (delay < 120 * 60) return 'text-orange-600 dark:text-orange-400';
		return 'text-red-600 dark:text-red-400';
	}
</script>

<h1>flybondi.fail</h1>
<p>se vieneee</p>
<div class="w-full max-w-[1000px]">
	<!-- Desktop Table View -->
	<table
		class="hidden w-full overflow-hidden rounded-lg bg-white shadow-md md:table dark:bg-neutral-800"
	>
		<thead class="bg-neutral-200 dark:bg-neutral-700">
			<tr>
				<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Vuelo</th>
				<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Ruta</th>
				<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Hora Programada</th>
				<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Hora Real</th>
				<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Diferencia</th>
			</tr>
		</thead>
		<tbody>
			{#each vuelos as vuelo}
				<tr class="border-b border-neutral-200 dark:border-neutral-700">
					<td class="px-4 py-2 text-neutral-900 dark:text-neutral-100">
						{vuelo.json.nro}
					</td>
					<td class="px-4 py-2 text-neutral-900 dark:text-neutral-100">
						{getAirport(vuelo.json.arpt)} → {getAirport(vuelo.json.IATAdestorig)}
					</td>
					<td class="px-4 py-2 text-neutral-900 dark:text-neutral-100">
						{formatDateTime(vuelo.stda)}
					</td>
					<td class="px-4 py-2 text-neutral-900 dark:text-neutral-100">
						{formatDateTime(vuelo.atda)}
					</td>
					<td class={`px-4 py-2 font-bold ${getDelayColor(vuelo.delta)}`}>
						<span class="flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="mr-1 h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							{delayString(vuelo)}
						</span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- Mobile Card View -->
	<div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:hidden">
		{#each vuelos as vuelo}
			<div class="rounded-lg bg-neutral-50 px-4 py-3 shadow dark:bg-neutral-800">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-lg font-bold text-neutral-900 dark:text-neutral-100">
						{vuelo.json.nro}
					</span>
					<span class={`font-bold ${getDelayColor(vuelo.delta)} flex items-center`}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="mr-1 h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						{delayString(vuelo)}
					</span>
				</div>
				<div class="grid grid-cols-[auto_1fr] gap-2 text-sm">
					<div class="text-neutral-600 dark:text-neutral-400">Ruta:</div>
					<div class="text-neutral-900 dark:text-neutral-100">
						{getAirport(vuelo.json.arpt)} → {getAirport(vuelo.json.IATAdestorig)}
					</div>
					<div class="text-neutral-600 dark:text-neutral-400">Hora:</div>
					<div class="text-neutral-900 dark:text-neutral-100">
						<del>{formatDateTime(vuelo.stda)}</del>
						{formatDateTime(vuelo.atda)}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
