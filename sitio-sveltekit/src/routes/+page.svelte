<script lang="ts">
	import { formatDuration, intervalToDuration, type Duration } from 'date-fns';
	import { es } from 'date-fns/locale/es';
	import dayjs from 'dayjs';
	import airports from '$lib/aerolineas-airports.json';
	import { Button } from '@/components/ui/button';
	import type { Vuelo } from '$lib';
	import { ArrowLeftIcon, ArrowRightIcon, ClockIcon } from 'lucide-svelte';
	import NuloScienceSvg from '$lib/assets/Nulo_Science_Inc.svg';
	import FlybondiSvg from '$lib/assets/flybondi.svg';

	export let data;
	$: ({ vuelos: todosLosVuelos, date, hasTomorrowData, hasYesterdayData } = data);
	$: vuelos = todosLosVuelos.filter((vuelo) => vuelo.json.idaerolinea === 'FO');
	$: aerolineasVuelos = todosLosVuelos.filter((vuelo) => vuelo.json.idaerolinea === 'AR');
	$: vuelosAtrasados = vuelos.filter((vuelo) => vuelo.delta > 60 * 30);

	$: promedioDelta = vuelos.reduce((acc, v) => acc + v.delta, 0) / vuelos.length;
	$: promedioDeltaAerolineas =
		aerolineasVuelos.reduce((acc, v) => acc + v.delta, 0) / aerolineasVuelos.length;

	function getTotalSeats(vuelo: Vuelo) {
		const asientos = vuelo.config_de_asientos?.match(/\w(\d+)/);
		return (
			asientos
				?.slice(1)
				.map((a) => parseInt(a))
				.reduce((a, b) => a + b, 0) ?? 180
		);
	}

	$: totalSegundosDesperdiciados = vuelos
		.map((vuelo) => vuelo.delta * getTotalSeats(vuelo) * 0.75)
		.reduce((prev, acc) => prev + acc, 0);

	function delayString(vuelo: Vuelo) {
		const delayed = vuelo.delta > 0;
		const shorter = (s: string) =>
			s
				.replace(' horas', 'hs')
				.replace(' hora', 'h')
				.replace(' minutos', 'min')
				.replace(' minuto', 'min');
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

	const dateTimeFormatter = Intl.DateTimeFormat('es-AR', {
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone: 'America/Argentina/Buenos_Aires'
	});

	const dateFormatter = Intl.DateTimeFormat('es-AR', {
		// weekday: 'long',
		day: '2-digit',
		month: '2-digit',
		timeZone: 'America/Argentina/Buenos_Aires'
	});

	const longDateFormatter = Intl.DateTimeFormat('es-AR', {
		weekday: 'long',
		day: '2-digit',
		month: 'long',
		year: 'numeric',
		timeZone: 'America/Argentina/Buenos_Aires'
	});

	function formatDateTime(timestamp: Date) {
		const date = dayjs();
		return date.isSame(timestamp, 'day')
			? timeFormatter.format(timestamp)
			: dateTimeFormatter.format(timestamp);
	}

	const getAirport = (iata: string) => {
		const airport = airports.data.find((a) => a.iata === iata);
		return airport ? airport.alias : iata;
	};

	function getDurationFromSeconds(seconds: number) {
		return intervalToDuration({ start: 0, end: seconds * 1000 });
	}
	function formatDurationWithoutSeconds(duration: Duration) {
		return formatDuration({ ...duration, seconds: 0 }, { locale: es });
	}

	function getDelayColor(delay: number, multiplier: number = 1) {
		if (delay <= 0) return 'text-green-600 dark:text-green-400';
		if (delay < 18 * 60 * multiplier) return 'text-green-500 dark:text-green-400';
		if (delay < 60 * 60 * multiplier) return 'text-yellow-600 dark:text-yellow-400';
		if (delay < 120 * 60 * multiplier) return 'text-orange-600 dark:text-orange-400';
		return 'text-red-600 dark:text-red-400';
	}

	function flightradar24(vuelo: Vuelo) {
		return `https://www.flightradar24.com/data/flights/${vuelo.json.nro.replace(' ', '').toLowerCase()}`;
	}
</script>

<h1 class="mb-4 flex items-end justify-center">
	<img src={FlybondiSvg} alt="Flybondi" class="h-8" />
	<span class="text-4xl font-medium leading-none text-red-600">.fail</span>
</h1>

<main class="mx-auto max-w-[1000px]">
	<nav class="mb-4 flex items-center justify-between gap-4 text-center text-4xl font-bold">
		{#if hasYesterdayData}
			<Button
				variant="outline"
				size="icon"
				href="/?date={dayjs(date).subtract(1, 'day').format('YYYY-MM-DD')}"
			>
				<ArrowLeftIcon class="h-4 w-4" />
			</Button>
		{:else}
			<div></div>
		{/if}
		<h3 class="text-brand">
			{longDateFormatter.format(dayjs(date).toDate())}
		</h3>
		{#if hasTomorrowData}
			<Button
				variant="outline"
				size="icon"
				href="/?date={dayjs(date).add(1, 'day').format('YYYY-MM-DD')}"
			>
				<ArrowRightIcon class="h-4 w-4" />
			</Button>
		{:else}
			<div></div>
		{/if}
	</nav>

	{#if vuelos.length > 0}
		<div class="mb-4 grid grid-rows-3 gap-4 text-balance md:grid-cols-2">
			<div
				class="row-span-3 flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-4 text-xl dark:bg-neutral-800"
			>
				<span class="text-brand text-[5rem] font-bold leading-none md:text-[10rem]">
					{Math.round((vuelosAtrasados.length / vuelos.length) * 100)}%
				</span>
				<span>vuelos con más de 30 minutos de atraso.</span>
			</div>
			<div class=" rounded-lg border bg-neutral-50 p-4 text-xl dark:bg-neutral-800">
				En promedio, los vuelos de Flybondi de hoy se atrasaron por
				<span class={`font-bold ${getDelayColor(promedioDelta, 1)}`}>
					{formatDurationWithoutSeconds(getDurationFromSeconds(promedioDelta))}
				</span>.
			</div>

			<div class="rounded-lg border bg-neutral-50 p-4 text-xl dark:bg-neutral-800">
				En comparacion, los vuelos de Aerolineas Argentinas se atrasaron en promedio
				<span class={`font-bold ${getDelayColor(promedioDeltaAerolineas, 1)}`}>
					{formatDurationWithoutSeconds(getDurationFromSeconds(promedioDeltaAerolineas))}
				</span>.
			</div>
			<div class="rounded-lg border bg-neutral-50 p-4 text-xl dark:bg-neutral-800">
				En total, Flybondi desperdició aproximadamente
				<span class="font-bold">
					{formatDurationWithoutSeconds(getDurationFromSeconds(totalSegundosDesperdiciados))}
				</span>
				de vida entre todos sus pasajeros.
			</div>
		</div>
	{:else}
		<p class="mb-4 text-lg">No hay datos de vuelos para mostrar</p>
	{/if}

	<div class="w-full max-w-[1000px]">
		<!-- Desktop Table View -->
		<table
			class="hidden w-full overflow-hidden rounded-lg bg-white shadow-md md:table dark:bg-neutral-800"
		>
			<thead class="bg-neutral-200 dark:bg-neutral-700">
				<tr>
					<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Vuelo</th>
					<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Ruta</th>
					<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Hora Programada</th
					>
					<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Hora Real</th>
					<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Diferencia</th>
				</tr>
			</thead>
			<tbody>
				{#each vuelos as vuelo}
					<tr class="border-b border-neutral-200 dark:border-neutral-700">
						<td class="px-4 py-2 text-neutral-900 dark:text-neutral-100">
							<a
								href={flightradar24(vuelo)}
								rel="noreferrer noopener"
								target="_blank"
								class="underline"
							>
								{vuelo.json.nro}
							</a>
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
								<ClockIcon class="mr-1 h-4 w-4" />
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
				<div class="rounded-lg border bg-neutral-50 px-4 py-3 dark:bg-neutral-800">
					<div class="mb-2 flex items-center justify-between">
						<a
							href={flightradar24(vuelo)}
							target="_blank"
							rel="noreferrer noopener"
							class="text-lg font-bold text-neutral-900 underline dark:text-neutral-100"
						>
							{vuelo.json.nro}
						</a>
						<span class={`font-bold ${getDelayColor(vuelo.delta)} flex items-center`}>
							<ClockIcon class="mr-1 h-4 w-4" />
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
</main>

<footer
	class="mt-10 flex flex-col items-center justify-center text-center text-sm text-neutral-600 dark:text-neutral-400"
>
	<p class="prose mb-4 max-w-[800px]">
		Flybondi.fail no está afiliado con Flybondi. La información presentada es meramente informativa.
		No nos hacemos responsables de los errores que puedan haber en la información presentada.
	</p>

	<div class="flex flex-col flex-wrap items-center justify-center gap-4 text-xl sm:flex-row">
		<span>Un experimento de</span>
		<a href="https://nulo.lol">
			<img src={NuloScienceSvg} alt="Nulo Science Inc" class="w-30 h-16" />
		</a>
		<span>&</span>
		<a href="https://visualizando.ar" class="bg-[#FF666C] px-4 py-2 font-bold text-[#28FFD7]"
			>visualizando.ar</a
		>
	</div>
</footer>
