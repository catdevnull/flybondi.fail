<script lang="ts">
	import { formatDuration, intervalToDuration, type Duration } from 'date-fns';
	import { es } from 'date-fns/locale/es';
	import dayjs from 'dayjs';
	import airports from '$lib/aerolineas-airports.json';
	import { Button } from '@/components/ui/button';
	import type { Vuelo } from '$lib';
	import { ArrowLeftIcon, ArrowRightIcon, ClockIcon, PlaneIcon } from 'lucide-svelte';
	import NuloScienceSvg from '$lib/assets/Nulo_Science_Inc.svg';
	import FlybondiSvg from '$lib/assets/flybondi.svg';
	import Icon from '@iconify/svelte';

	export let data;
	$: ({ vuelos: todosLosVuelos, date, hasTomorrowData, hasYesterdayData } = data);
	$: vuelos = todosLosVuelos
		.filter((vuelo) => vuelo.json.idaerolinea === 'FO')
		.sort((a, b) => b.delta - a.delta);
	$: aerolineasVuelos = todosLosVuelos.filter((vuelo) => vuelo.json.idaerolinea === 'AR');
	$: vuelosAtrasados = vuelos.filter((vuelo) => vuelo.delta > 60 * 30);

	$: promedioDelta = vuelos.reduce((acc, v) => acc + v.delta, 0) / vuelos.length;
	$: promedioDeltaAerolineas =
		aerolineasVuelos.reduce((acc, v) => acc + v.delta, 0) / aerolineasVuelos.length;

	$: vueloMasAtrasado = vuelos.reduce((acc, v) => (v.delta > acc.delta ? v : acc), vuelos[0]);

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

	function delayString(vuelo: Vuelo, showPrefix: boolean = true) {
		const delayed = vuelo.delta > 0;
		const shorter = (s: string) =>
			s
				.replace(' horas', 'hs')
				.replace(' hora', 'h')
				.replace(' minutos', 'min')
				.replace(' minuto', 'min');
		if (delayed) {
			return shorter(
				(showPrefix ? 'salió ' : '') +
					formatDuration(
						intervalToDuration({
							start: new Date(vuelo.stda),
							end: new Date(vuelo.atda)
						}),
						{ locale: es }
					) +
					' tarde'
			);
		} else if (vuelo.delta < 60 && vuelo.delta > -60) {
			return 'a tiempo';
		} else {
			return shorter(
				(showPrefix ? 'adelantado ' : '') +
					formatDuration(
						intervalToDuration({
							start: new Date(vuelo.atda),
							end: new Date(vuelo.stda)
						}),
						{ locale: es }
					)
			);
		}
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

	function getDelayColor(delay: number) {
		if (delay <= 15 * 60) return 'text-[#8dd895] dark:text-green-600';
		// if (delay < 30 * 60) return 'text-green-500 dark:text-green-700';
		if (delay < 30 * 60) return 'text-[#f1e12d] dark:text-yellow-400';
		if (delay < 45 * 60) return 'text-[#eb6b00] dark:text-orange-400';
		return 'text-[#b10000] dark:text-red-400';
	}

	function flightradar24(vuelo: Vuelo) {
		return `https://www.flightradar24.com/data/flights/${vuelo.json.nro.replace(' ', '').toLowerCase()}`;
	}
</script>

<svelte:head>
	{#if data.hasCustomDate}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<h1 class="mb-4 flex items-end justify-center">
	<img src={FlybondiSvg} alt="Flybondi" class="h-8" />
	<span class="text-4xl font-medium leading-none text-red-600">.fail</span>
</h1>

<main class="mx-auto max-w-[1000px]">
	<nav class="mb-4 flex items-center justify-between gap-4 text-center">
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
		<h3 class="text-brand flex flex-col items-center justify-center">
			<span class="leading-tight">viendo datos de</span>
			<span class="text-2xl font-bold leading-tight"
				>{longDateFormatter.format(dayjs(date).toDate())}</span
			>
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
				class="row-span-3 flex flex-col items-center justify-center gap-4 rounded-lg border bg-neutral-50 p-4 text-xl dark:border-neutral-700 dark:bg-neutral-800"
			>
				<div class="grid grid-cols-9 gap-2">
					{#each vuelos as vuelo}
						<button
							on:click={() => {
								const els = Array.from<HTMLElement>(
									document.querySelectorAll(`[data-id="${vuelo.aerolineas_flight_id}"]`)
								);
								const el = els.find((el) => window.getComputedStyle(el).display !== 'none');
								el?.scrollIntoView({ behavior: 'smooth' });
								el?.focus();
							}}
						>
							<Icon class="h-8 w-8 {getDelayColor(vuelo.delta)}" icon="fa-solid:plane" />
						</button>
					{/each}
				</div>
				<p class="text-center">
					<span class="font-bold"
						>De {vuelos.length} vuelos, {vuelosAtrasados.length} tardaron mas de 30 minutos en despegar.</span
					>
				</p>
			</div>
			<div
				class="flex flex-col gap-2 rounded-lg border bg-neutral-50 p-4 text-xl dark:border-neutral-700 dark:bg-neutral-800"
			>
				<p>
					En promedio, los vuelos de Flybondi de hoy se atrasaron por
					<span class={`font-bold ${getDelayColor(promedioDelta)}`}>
						{formatDurationWithoutSeconds(getDurationFromSeconds(promedioDelta))}
					</span>.
				</p>
				<p>
					Para comparar, los vuelos de Aerolineas Argentinas se atrasaron en promedio
					<span class={`font-bold ${getDelayColor(promedioDeltaAerolineas)}`}>
						{formatDurationWithoutSeconds(getDurationFromSeconds(promedioDeltaAerolineas))}
					</span>.
				</p>
			</div>

			<div
				class="flex flex-col justify-center rounded-lg border bg-neutral-50 p-4 text-xl dark:border-neutral-700 dark:bg-neutral-800"
			>
				<p>
					En total, Flybondi desperdició aproximadamente
					<span class="font-bold">
						{formatDurationWithoutSeconds({
							...getDurationFromSeconds(totalSegundosDesperdiciados),
							minutes: 0,
							hours: 0
						})}
					</span>
					de vida entre todos sus pasajeros.
				</p>
			</div>

			<div
				class="flex flex-col justify-center rounded-lg border bg-neutral-50 p-4 text-xl dark:border-neutral-700 dark:bg-neutral-800"
			>
				<p>
					El vuelo más atrasado fue el
					<a href={flightradar24(vueloMasAtrasado)} class="underline">
						{vueloMasAtrasado.json.nro}
					</a>
					de {getAirport(vueloMasAtrasado.json.arpt)} a {getAirport(
						vueloMasAtrasado.json.IATAdestorig
					)}, que salió
					<span class={`font-bold ${getDelayColor(vueloMasAtrasado.delta)}`}>
						{delayString(vueloMasAtrasado, false)}
					</span>. ¡Que bodrio!
				</p>
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
					<tr
						class="hidden border-b border-neutral-200 md:table-row dark:border-neutral-700"
						data-id={vuelo.aerolineas_flight_id}
					>
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
				<div
					class="rounded-lg border bg-neutral-50 px-4 py-3 focus:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
					data-id={vuelo.aerolineas_flight_id}
				>
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

	<div class="mb-4 flex flex-col flex-wrap items-center justify-center gap-4 text-xl sm:flex-row">
		<span>Flybondi.fail es un experimento de</span>
		<a href="https://nulo.lol">
			<img src={NuloScienceSvg} alt="Nulo Science Inc" class="w-30 h-16 dark:invert" />
		</a>
		<span>&</span>
		<a href="https://visualizando.ar" class="bg-[#FF666C] px-4 py-2 font-bold text-[#28FFD7]"
			>visualizando.ar</a
		>
	</div>

	<p class="text-brand text-lg underline">
		<a href="mailto:hola@nulo.lol">hola@nulo.lol</a>
	</p>
</footer>
