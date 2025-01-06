<script lang="ts">
	import { formatDuration, intervalToDuration, type Duration } from 'date-fns';
	import { es } from 'date-fns/locale/es';
	import dayjs from 'dayjs';
	import AIRPORTS from '$lib/aerolineas-airports.json';
	import { Button } from '@/components/ui/button';
	import type { Vuelo } from '$lib';
	import {
		AlertCircleIcon,
		AlertOctagonIcon,
		ArrowDownIcon,
		ArrowLeftIcon,
		ArrowRightIcon,
		ClockIcon,
		PlaneIcon,
		PlaneTakeoffIcon
	} from 'lucide-svelte';
	import NuloScienceSvg from '$lib/assets/Nulo_Science_Inc.svg';
	import FlybondiSvg from '$lib/assets/flybondi.svg';
	import Icon from '@iconify/svelte';
	import AverageVis from './average-vis.svelte';
	import { getDelayColor, COLOR_CLASSES } from '$lib/colors';
	import { AEROPUERTOS_FLYBONDI } from '@/aeropuertos-flybondi';
	import TimeBar from './time-bar.svelte';
	import Alert from '@/components/ui/alert/alert.svelte';
	import AlertTitle from '@/components/ui/alert/alert-title.svelte';
	import AlertDescription from '@/components/ui/alert/alert-description.svelte';
	import DateTime from './date-time.svelte';

	export let data;
	$: ({ vuelos: todosLosVuelos, date, hasTomorrowData, hasYesterdayData } = data);

	$: vuelos = todosLosVuelos
		.filter((v) => v.json.idaerolinea === 'FO')
		.filter(
			(v): v is Vuelo & ({ atda: Date } | { json: { estes: 'Cancelado' } }) =>
				!!v.atda || v.json.estes === 'Cancelado'
		)
		.sort((a, b) => {
			if (a.json.estes === 'Cancelado') return -1;
			if (b.json.estes === 'Cancelado') return 1;
			return b.delta - a.delta;
		});
	$: aerolineasVuelosAterrizados = todosLosVuelos.filter(
		(vuelo) =>
			vuelo.json.idaerolinea === 'AR' &&
			vuelo.atda !== undefined &&
			AEROPUERTOS_FLYBONDI.includes(vuelo.json.IATAdestorig) &&
			AEROPUERTOS_FLYBONDI.includes(vuelo.json.arpt)
	);
	$: vuelosAtrasados = vuelos.filter((vuelo) => vuelo.delta > 60 * 30);

	$: promedioDelta =
		vuelosAterrizados.reduce((acc, v) => acc + v.delta, 0) / vuelosAterrizados.length;
	$: promedioDeltaAerolineas =
		aerolineasVuelosAterrizados.reduce((acc, v) => acc + v.delta, 0) /
		aerolineasVuelosAterrizados.length;

	$: vuelosAterrizados = vuelos.filter((v): v is Vuelo & { atda: Date } => v.atda !== undefined);
	$: vuelosCancelados = vuelos.filter((v) => v.json.estes === 'Cancelado');

	$: vueloMasAtrasado = vuelosAterrizados.reduce<Vuelo & { atda: Date }>(
		(acc, v) => (v.delta > acc.delta ? v : acc),
		vuelosAterrizados[0]
	);

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

	function delayString(vuelo: (typeof vuelos)[number], showPrefix: boolean = true) {
		if (vuelo.json.estes === 'Cancelado') {
			return 'cancelado';
		} else if (vuelo.atda === undefined) {
			throw new Error('no atda');
		}

		const delayed = vuelo.delta > 0;
		const shorter = (s: string) =>
			s
				.replace(' horas', 'hs')
				.replace(' hora', 'h')
				.replace(' minutos', 'min')
				.replace(' minuto', 'min');
		if (delayed) {
			return shorter(
				// (showPrefix ? 'salió ' : '') +
				formatDuration(
					intervalToDuration({
						start: new Date(vuelo.stda),
						end: new Date(vuelo.atda)
					}),
					{ locale: es }
				) + ' tarde'
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

	const longDateFormatter = Intl.DateTimeFormat('es-AR', {
		weekday: 'short',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		timeZone: 'America/Argentina/Buenos_Aires'
	});

	const OTHER_AIRPORTS = {
		CNQ: 'Corrientes',
		GIG: 'Rio de Janeiro',
		GRU: 'Sao Paulo',
		USH: 'Ushuaia',
		FLN: 'Florianopolis',
		FTE: 'El Calafate',
		NQN: 'Neuquen',
		ASU: 'Asunción'
	};
	const getAirport = (iata: string) => {
		const airport = AIRPORTS.data.find((a) => a.iata === iata);
		if (airport) return airport.alias;
		if (OTHER_AIRPORTS[iata as keyof typeof OTHER_AIRPORTS])
			return OTHER_AIRPORTS[iata as keyof typeof OTHER_AIRPORTS];
		console.warn(`Airport ${iata} not found`);
		return iata;
	};

	function getDurationFromSeconds(seconds: number) {
		return intervalToDuration({ start: 0, end: seconds * 1000 });
	}
	function formatDurationWithoutSeconds(duration: Duration) {
		return formatDuration({ ...duration, seconds: 0 }, { locale: es });
	}

	function flightradar24(vuelo: Vuelo) {
		return `https://www.flightradar24.com/data/flights/${vuelo.json.nro.replace(' ', '').toLowerCase()}`;
	}

	function goToVuelo(e: MouseEvent) {
		const target = e.currentTarget as HTMLElement;
		const els = Array.from<HTMLElement>(
			document.querySelectorAll(`[data-id="${target.dataset.id}"]`)
		);
		const el = els.find((el) => window.getComputedStyle(el).display !== 'none');
		el?.scrollIntoView({ behavior: 'smooth' });
		el?.focus();
	}

	function genPhrase() {
		const frases = [
			'¡Qué bajón!',
			'¡Qué macana!',
			'¡Qué embole!',
			'¡Qué plomo!',
			'¡Qué quilombo!',
			'¡Qué desastre!',
			'¡Qué paja!',
			'¡Qué cagada!',
			'¡Qué papelón!',
			'¡Qué mala leche!'
		];
		return frases[Math.floor(Math.random() * frases.length)];
	}
</script>

<svelte:head>
	{#if data.hasCustomDate}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<main class="mx-auto max-w-[1000px]">
	<nav
		class="sticky top-0 mb-4 flex flex-col border-b bg-white pb-1 text-center dark:bg-neutral-800"
	>
		<h1 class="flex items-end justify-center">
			<img src={FlybondiSvg} alt="Flybondi" class="h-8" />
			<span class="text-4xl font-medium leading-none text-red-600">.fail</span>
		</h1>

		<div class="flex items-center justify-between gap-4">
			{#if hasYesterdayData}
				<Button
					variant="outline"
					size="icon"
					class="size-8"
					href="/?date={dayjs(date).subtract(1, 'day').format('YYYY-MM-DD')}"
				>
					<ArrowLeftIcon class="h-4 w-4" />
				</Button>
			{:else}
				<div></div>
			{/if}
			<h3 class="flex flex-col items-center justify-center text-neutral-700 dark:text-neutral-300">
				<span class="text-xs leading-tight">viendo datos de</span>
				<span class=" font-bold leading-tight"
					>{longDateFormatter.format(dayjs(date).toDate()).replace(',', '')}</span
				>
			</h3>
			{#if hasTomorrowData}
				<Button
					variant="outline"
					size="icon"
					class="size-8"
					href="/?date={dayjs(date).add(1, 'day').format('YYYY-MM-DD')}"
				>
					<ArrowRightIcon class="h-4 w-4" />
				</Button>
			{:else}
				<div></div>
			{/if}
		</div>
	</nav>

	{#if vuelos.length > 0}
		<div class="mb-4 grid grid-rows-3 gap-4 text-balance md:grid-cols-2">
			<div
				class="row-span-3 flex flex-col items-center justify-center gap-4 rounded-lg border bg-neutral-50 p-4 text-xl dark:border-neutral-700 dark:bg-neutral-800"
			>
				<div class="grid grid-cols-9 gap-2">
					{#each vuelos as vuelo}
						<button on:click={goToVuelo} data-id={vuelo.aerolineas_flight_id}>
							{#if vuelo.atda}
								<Icon class="h-8 w-8 {getDelayColor(vuelo.delta)}" icon="fa-solid:plane" />
							{:else if vuelo.json.estes === 'Cancelado'}
								<Icon
									class="h-8 w-8 text-neutral-700 dark:text-neutral-300"
									icon="fa-solid:plane-slash"
								/>
							{/if}
						</button>
					{/each}
				</div>
				<p class="text-center">
					<span class="font-bold"
						>De {vuelos.length} vuelos, {vuelosAtrasados.length} tardaron mas de 30 minutos en despegar{#if vuelosCancelados.length > 0}
							{' '}y
							{vuelosCancelados.length} vuelo{vuelosCancelados.length > 1
								? 's fueron cancelados'
								: ' fue cancelado'}.
						{:else}.
						{/if}
					</span>
				</p>
				<div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
					<div class="flex items-center gap-1">
						<Icon
							class="size-4 text-neutral-700 dark:text-neutral-300"
							icon="fa-solid:plane-slash"
						/>
						<span>Cancelado</span>
					</div>
					<div class="flex items-center gap-1">
						<Icon class="size-4 text-[#b10000]" icon="fa-solid:plane" />
						<span>mas de 45min</span>
					</div>
					<div class="flex items-center gap-1">
						<Icon class="size-4 {COLOR_CLASSES[45 * 60]}" icon="fa-solid:plane" />
						<span>45-30min</span>
					</div>
					<div class="flex items-center gap-1">
						<Icon class="size-4 {COLOR_CLASSES[30 * 60]}" icon="fa-solid:plane" />
						<span>30-15min</span>
					</div>
					<div class="flex items-center gap-1">
						<Icon class="size-4 {COLOR_CLASSES[15 * 60]}" icon="fa-solid:plane" />
						<span>15-0min</span>
					</div>
				</div>
			</div>
			<div
				class="flex flex-col items-center justify-center gap-2 rounded-lg border bg-neutral-50 text-xl dark:border-neutral-700 dark:bg-neutral-800"
			>
				<figure class="mb-3 mt-1 w-full px-4">
					<figcaption class="my-2 text-xl">Promedio de retraso en el despegue</figcaption>
					<AverageVis
						airlineData={[
							{ name: 'Flybondi', avgDelay: promedioDelta / 60 },
							{ name: 'Aerolineas Argentinas', avgDelay: promedioDeltaAerolineas / 60 }
						]}
					/>
				</figure>
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
					<a href={flightradar24(vueloMasAtrasado)} class="hover:underline">
						{vueloMasAtrasado.json.nro}
					</a>
					de {getAirport(vueloMasAtrasado.json.arpt)} a {getAirport(
						vueloMasAtrasado.json.IATAdestorig
					)}, que salió
					<span class={`font-bold ${getDelayColor(vueloMasAtrasado.delta, true)}`}>
						{delayString(vueloMasAtrasado, false)}
					</span>. {genPhrase()}
				</p>
			</div>
		</div>
		{#if (dayjs(date).date() === 31 && dayjs(date).month() === 11) || (dayjs(date).date() === 1 && dayjs(date).month() === 0)}
			<Alert class="mb-4">
				<AlertCircleIcon class="size-4" />

				<AlertTitle>Problema con los datos</AlertTitle>
				<AlertDescription>
					Los datos de vuelos pueden ser inexactos debido al cambio de año. Vamos a arreglarlo
					eventualmente.
				</AlertDescription>
			</Alert>
		{/if}
	{:else}
		<p class="mb-4 text-lg">No hay datos de vuelos para mostrar</p>
	{/if}

	<div class="w-full max-w-[1000px]">
		<!-- Desktop Table View -->
		<table
			class="hidden w-full overflow-hidden rounded-lg bg-white shadow-md sm:table dark:bg-neutral-800"
		>
			<thead class="bg-neutral-200 dark:bg-neutral-700">
				<tr>
					<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Vuelo</th>
					<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Ruta</th>
					<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Hora Programada</th
					>
					<th class="px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">Hora Real</th>
					<th class="flex items-center px-4 py-2 text-left text-neutral-700 dark:text-neutral-300">
						Demora en despegar
						<ArrowDownIcon class="size-4" />
					</th>
				</tr>
			</thead>
			<tbody>
				{#each vuelos as vuelo}
					<tr
						class="hidden border-b border-neutral-200 sm:table-row dark:border-neutral-700"
						data-id={vuelo.aerolineas_flight_id}
					>
						<td class="whitespace-nowrap px-4 py-2 text-neutral-900 dark:text-neutral-100">
							<a
								href={flightradar24(vuelo)}
								rel="noreferrer noopener"
								target="_blank"
								class="hover:underline"
							>
								{vuelo.json.nro}
							</a>
						</td>
						<td class="px-4 py-2 text-neutral-900 dark:text-neutral-100">
							{getAirport(vuelo.json.arpt)} → {getAirport(vuelo.json.IATAdestorig)}
						</td>
						<td class="px-4 py-2 text-neutral-900 dark:text-neutral-100">
							<DateTime date={vuelo.stda} baseDate={date} />
						</td>
						<td class="px-4 py-2 text-neutral-900 dark:text-neutral-100">
							{#if vuelo.atda}
								<DateTime date={vuelo.atda} baseDate={date} />
							{/if}
						</td>
						<td class={`px-4 py-2 font-bold ${getDelayColor(vuelo.delta, true)}`}>
							{#if vuelo.atda}
								{delayString(vuelo)}

								<TimeBar maxSeconds={vueloMasAtrasado.delta} seconds={vuelo.delta} />
							{:else if vuelo.json.estes === 'Cancelado'}
								<span class="font-black text-black dark:text-neutral-100">Cancelado</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<!-- Mobile Card View -->
		<div class="grid grid-cols-1 gap-2 sm:hidden">
			<div class="my-1 flex items-center gap-2">
				<h2 class="text-xl font-bold leading-none text-neutral-900 dark:text-neutral-100">
					Detalle de los vuelos
				</h2>
				<hr class="flex-1 border-neutral-200 dark:border-neutral-700" />
			</div>
			{#each vuelos as vuelo}
				<div
					class="rounded-lg bg-neutral-100 px-2 py-1 dark:bg-neutral-800"
					data-id={vuelo.aerolineas_flight_id}
				>
					<div class="flex flex-col justify-between">
						<span class="text-sm text-neutral-900 dark:text-neutral-100">
							<a
								class="hover:underline"
								href={flightradar24(vuelo)}
								target="_blank"
								rel="noreferrer noopener"
							>
								{vuelo.json.nro}</a
							>
							-
							{getAirport(vuelo.json.arpt)} → {getAirport(vuelo.json.IATAdestorig)}
						</span>
						<div class="flex flex-row gap-2 text-sm text-neutral-900 dark:text-neutral-100">
							<del><DateTime date={vuelo.stda} baseDate={date} /></del>
							{#if vuelo.atda}
								<DateTime date={vuelo.atda} baseDate={date} />
							{:else if vuelo.json.estes === 'Cancelado'}
								<span class="font-black text-black dark:text-neutral-100">Cancelado</span>
							{/if}
							<span
								class={`font-bold ${vuelo.json.estes === 'Cancelado' ? 'font-black text-black dark:text-neutral-100' : getDelayColor(vuelo.delta, true)} flex items-center text-sm leading-none`}
							>
								{#if vuelo.atda}
									<PlaneTakeoffIcon class="mr-1 h-4 w-4" />
									{delayString(vuelo)}
								{:else if vuelo.json.estes === 'Cancelado'}{/if}
							</span>
						</div>

						{#if vuelo.atda}
							<TimeBar maxSeconds={vueloMasAtrasado.delta} seconds={vuelo.delta} />
						{:else if vuelo.json.estes === 'Cancelado'}{/if}
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

	<p class="text-lg">
		<a class="text-brand underline" href="mailto:hola@nulo.lol">hola@nulo.lol</a>
		⋅
		<a class="text-brand underline" href="https://x.com/esoesnulo">@esoesnulo</a>
	</p>
</footer>
