<script lang="ts">
	import { formatDuration, intervalToDuration, type Duration } from 'date-fns';
	import { es } from 'date-fns/locale/es';
	import dayjs from 'dayjs';
	import utc from 'dayjs/plugin/utc';
	import timezone from 'dayjs/plugin/timezone';
	dayjs.extend(utc);
	dayjs.extend(timezone);
	import AIRPORTS_ALIAS from '$lib/aerolineas-airports-subset-alias.json';
	import { Button, buttonVariants } from '@/components/ui/button';
	import type { Vuelo } from '$lib';
	import {
		AlertCircleIcon,
		ArrowDownIcon,
		ArrowLeftIcon,
		ArrowRightIcon,
		PlaneTakeoffIcon
	} from 'lucide-svelte';
	import Icon from '$lib/components/icon.svelte';
	import AverageVis from './average-vis.svelte';
	import { getDelayColor, COLOR_CLASSES } from '$lib/colors';
	import { AEROPUERTOS_FLYBONDI } from '@/aeropuertos-flybondi';
	import TimeBar from './time-bar.svelte';
	import DateTime from './date-time.svelte';
	import * as AlertDialog from '@/components/ui/alert-dialog';
	import * as Select from '@/components/ui/select';
	import { browser } from '$app/environment';
	import Footer from '@/components/footer.svelte';
	import cardPath from '$lib/assets/twitter-card.png';
	import { IATA_NAMES } from '@/aerolineas';

	export let data;
	$: ({ vuelos: todosLosVuelos, date, hasTomorrowData, hasYesterdayData } = data);

	function getAerolineaSeleccionada() {
		let aerolinea;
		if (browser) {
			aerolinea = new URL(location.href).searchParams.get('aerolinea');
		} else {
			aerolinea = data.aerolineaEnUrl;
		}
		if (aerolinea && Object.keys(IATA_NAMES).includes(aerolinea)) {
			return aerolinea as keyof typeof IATA_NAMES;
		}
		return 'FO';
	}
	let aerolineaSeleccionada = getAerolineaSeleccionada();
	$: {
		if (aerolineaSeleccionada !== getAerolineaSeleccionada() && browser) {
			const queryParams = new URLSearchParams(window.location.search);
			queryParams.set('aerolinea', aerolineaSeleccionada);
			window.history.pushState(null, '', window.location.pathname + '?' + queryParams.toString());
		}
	}

	$: aerolineasConVuelos = Object.keys(IATA_NAMES).filter((a) =>
		todosLosVuelos.some(
			(v) =>
				v.json.idaerolinea === a &&
				AEROPUERTOS_FLYBONDI.includes(v.json.arpt) &&
				AEROPUERTOS_FLYBONDI.includes(v.json.IATAdestorig) &&
				(!!v.atda || v.json.estes === 'Cancelado')
		)
	);

	$: vuelos = todosLosVuelos
		.filter((v) => v.json.idaerolinea === aerolineaSeleccionada)
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
			!!vuelo.atda &&
			AEROPUERTOS_FLYBONDI.includes(vuelo.json.IATAdestorig) &&
			AEROPUERTOS_FLYBONDI.includes(vuelo.json.arpt)
	);
	$: vuelosAtrasados = vuelos.filter((vuelo) => vuelo.delta >= 60 * 30);

	$: otrosVuelosAterrizados = todosLosVuelos.filter(
		(vuelo) =>
			!!vuelo.atda &&
			vuelo.json.idaerolinea !== 'AR' &&
			vuelo.json.idaerolinea !== aerolineaSeleccionada &&
			AEROPUERTOS_FLYBONDI.includes(vuelo.json.IATAdestorig) &&
			AEROPUERTOS_FLYBONDI.includes(vuelo.json.arpt)
	);

	$: promedioDelta =
		vuelosAterrizados.reduce((acc, v) => acc + v.delta, 0) / vuelosAterrizados.length;
	$: promedioDeltaAerolineas =
		aerolineasVuelosAterrizados.reduce((acc, v) => acc + v.delta, 0) /
		aerolineasVuelosAterrizados.length;

	$: promedioDeltaOtros =
		otrosVuelosAterrizados.reduce((acc, v) => acc + v.delta, 0) / otrosVuelosAterrizados.length;

	$: vuelosAterrizados = vuelos.filter((v): v is Vuelo & { atda: Date } => !!v.atda);
	$: vuelosCancelados = vuelos.filter((v) => v.json.estes === 'Cancelado');

	$: vueloMasAtrasado =
		vuelosAterrizados.length > 0 &&
		vuelosAterrizados.reduce((acc, v) => (v.delta > acc.delta ? v : acc), vuelosAterrizados[0]);

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
		} else if (!vuelo.atda) {
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
		ASU: 'Asunción',
		MCZ: 'Maceió'
	};
	const getAirport = (iata: string) => {
		const airport = AIRPORTS_ALIAS[iata as keyof typeof AIRPORTS_ALIAS];
		if (airport) return airport;
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

	$: aerolineaActual = IATA_NAMES[aerolineaSeleccionada];

	$: metaTitle = `${aerolineaSeleccionada !== 'FO' ? `${aerolineaActual} - ` : ''}${vuelosAtrasados.length} vuelos demorados y ${vuelosCancelados.length} cancelados`;
	$: metaDescription = `Hoy ${aerolineaActual} tuvo ${vuelosAtrasados.length} vuelos con más de 30 minutos de retraso${vuelosCancelados.length > 0 ? ` y ${vuelosCancelados.length} vuelos cancelados` : ''}.`;
</script>

<svelte:head>
	{#if data.hasCustomDate}
		<meta name="robots" content="noindex" />
	{/if}
	<title>{metaTitle} - failbondi.fail</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href="https://failbondi.fail" />

	<meta property="og:type" content="website" />
	<meta property="og:title" content={metaTitle} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content="https://failbondi.fail" />
	<meta property="og:image" content={'https://failbondi.fail' + cardPath} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@esoesnulo" />
	<meta name="twitter:title" content={metaTitle} />
	<meta name="twitter:description" content={metaDescription} />
	<meta name="twitter:url" content="https://failbondi.fail" />
	<meta name="twitter:image" content={'https://failbondi.fail' + cardPath} />
</svelte:head>

<nav
	class="sticky top-0 z-10 mb-4 flex flex-col border-b bg-white px-1 pb-1 text-center sm:px-4 dark:border-neutral-700 dark:bg-neutral-900"
>
	<h1 class="flex items-end justify-center">
		<span class="text-4xl font-medium leading-none text-red-600">failbondi.fail</span>
	</h1>

	<div class="mx-auto flex max-w-[600px] items-center justify-between gap-4">
		{#if hasYesterdayData}
			<Button
				variant="outline"
				size="icon"
				class="size-8"
				href="/?date={dayjs(date)
					.tz('America/Argentina/Buenos_Aires')
					.subtract(1, 'day')
					.format('YYYY-MM-DD')}{aerolineaSeleccionada !== 'FO'
					? '&aerolinea=' + aerolineaSeleccionada
					: ''}"
				aria-label="Ir al día anterior"
			>
				<ArrowLeftIcon class="h-4 w-4" />
			</Button>
		{:else}
			<div></div>
		{/if}
		<div class="flex items-center gap-4">
			<span
				class="flex w-full flex-col items-center justify-center text-neutral-700 dark:text-neutral-300"
			>
				<span class="text-xs leading-tight">viendo datos de</span>
				<span class=" font-bold leading-tight"
					>{longDateFormatter.format(dayjs(date).toDate()).replace(',', '')}</span
				>
			</span>
			<Select.Root
				selected={{ value: aerolineaSeleccionada, label: IATA_NAMES[aerolineaSeleccionada] }}
				onSelectedChange={(e) => (aerolineaSeleccionada = e?.value as keyof typeof IATA_NAMES)}
			>
				<Select.Trigger class="w-[150px] sm:w-[200px]">
					<Select.Value placeholder="Seleccionar aerolínea" />
				</Select.Trigger>
				<Select.Content>
					{#each aerolineasConVuelos as aerolinea}
						<Select.Item value={aerolinea}>
							{IATA_NAMES[aerolinea as keyof typeof IATA_NAMES]}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		{#if hasTomorrowData}
			<Button
				variant="outline"
				size="icon"
				class="size-8"
				href="/?date={dayjs(date)
					.tz('America/Argentina/Buenos_Aires')
					.add(1, 'day')
					.format('YYYY-MM-DD')}"
				aria-label="Ir al día siguiente"
			>
				<ArrowRightIcon class="h-4 w-4" />
			</Button>
		{:else}
			<div></div>
		{/if}
	</div>
</nav>

<main class="mx-auto max-w-[1000px] p-4">
	{#if vuelos.length > 0}
		<div class="mb-4 grid grid-rows-4 gap-4 text-balance md:grid-cols-2">
			<div
				class="row-span-4 flex flex-col items-center justify-center gap-4 rounded-lg border bg-neutral-50 p-4 text-xl dark:border-neutral-700 dark:bg-neutral-800"
			>
				<div class="grid grid-cols-9 gap-2">
					{#each vuelos as vuelo}
						{#if vuelo.atda}
							<Icon
								class="h-8 w-8 {getDelayColor(vuelo.delta)}"
								icon="fa6-solid-plane"
								aria-label="Vuelo {vuelo.json.nro} con {vuelo.delta / 60} minutos de retraso"
							/>
						{:else if vuelo.json.estes === 'Cancelado'}
							<Icon
								class="h-8 w-8 text-neutral-700 dark:text-neutral-300"
								icon="fa6-solid-plane-slash"
								aria-label="Vuelo {vuelo.json.nro} cancelado"
							/>
						{/if}
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
							icon="fa6-solid-plane-slash"
						/>
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
			<div
				class="row-span-2 flex flex-col items-center justify-center gap-2 rounded-lg border bg-neutral-50 text-xl dark:border-neutral-700 dark:bg-neutral-800"
			>
				<figure class="mb-3 mt-1 w-full px-4">
					<figcaption class="my-2 flex justify-between text-xl">
						Promedio de retraso en el despegue

						<AlertDialog.Root>
							<AlertDialog.Trigger
								class="{buttonVariants({ size: 'icon', variant: 'outline' })} !size-7"
								aria-label="Ver metodología"
							>
								<Icon icon="grommet-icons-info" class="size-4" />
							</AlertDialog.Trigger>
							<AlertDialog.Content>
								<AlertDialog.Header>
									<AlertDialog.Title>Metodología</AlertDialog.Title>
									<AlertDialog.Description class="prose prose-neutral dark:prose-invert">
										Para calcular el promedio, se toman todos los vuelos que aterrizaron y se
										calcula la diferencia entre la hora programada y la hora real de despegue. Solo
										se incluyen vuelos que:
										<ul>
											<li>Ya despegaron (tienen hora real de despegue)</li>
											<li>vuelan entre aeropuertos donde también opera Flybondi</li>
										</ul>
										Los vuelos cancelados no se incluyen en este cálculo.
										<a href="/acerca">Mas info</a>
									</AlertDialog.Description>
								</AlertDialog.Header>
								<AlertDialog.Footer>
									<AlertDialog.Cancel>oka</AlertDialog.Cancel>
								</AlertDialog.Footer>
							</AlertDialog.Content>
						</AlertDialog.Root>
					</figcaption>
					<AverageVis
						airlineData={[
							{
								name: IATA_NAMES[aerolineaSeleccionada],
								avgDelay: promedioDelta / 60,
								nVuelos: vuelosAterrizados.length
							},
							{
								name: 'Aerolineas Argentinas',
								avgDelay: promedioDeltaAerolineas / 60,
								nVuelos: aerolineasVuelosAterrizados.length
							},
							{
								name: 'Otros',
								avgDelay: promedioDeltaOtros / 60,
								nVuelos: otrosVuelosAterrizados.length,
								otherAerolineas: [...new Set(otrosVuelosAterrizados.map((v) => v.json.idaerolinea))]
							}
						]}
					/>
				</figure>
			</div>

			{#if totalSegundosDesperdiciados > 60 * 60 * 24}
				<div
					class="relative flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-4 pr-8 text-xl dark:border-neutral-700 dark:bg-neutral-800"
				>
					<p>
						En total, {IATA_NAMES[aerolineaSeleccionada]} desperdició aproximadamente
						<span class="font-bold">
							{formatDurationWithoutSeconds({
								...getDurationFromSeconds(totalSegundosDesperdiciados),
								minutes: 0,
								hours: 0
							})}
						</span>
						de vida entre todos sus pasajeros.
					</p>

					<AlertDialog.Root>
						<AlertDialog.Trigger
							class="absolute right-4 top-4 !size-7 {buttonVariants({
								size: 'icon',
								variant: 'outline'
							})}"
							aria-label="Ver metodología"
						>
							<Icon icon="grommet-icons-info" class="size-4" />
						</AlertDialog.Trigger>
						<AlertDialog.Content>
							<AlertDialog.Header>
								<AlertDialog.Title>Metodología</AlertDialog.Title>
								<AlertDialog.Description class="prose prose-neutral dark:prose-invert">
									Para calcular el tiempo total desperdiciado, se:
									<ul>
										<li>Toma cada vuelo que ya despegó</li>
										<li>Multiplica el retraso por la cantidad de asientos del avión</li>
										<li>Asume una ocupación del 75% en cada vuelo</li>
									</ul>
									Por ejemplo, si un avión de 180 asientos se atrasa 1 hora, se calcula: 60 minutos ×
									180 asientos × 0.75 = 8.100 minutos-persona desperdiciados.
									<p>Los vuelos cancelados no se incluyen en este cálculo.</p>
									<a href="/acerca">Mas info</a>
								</AlertDialog.Description>
							</AlertDialog.Header>
							<AlertDialog.Footer>
								<AlertDialog.Cancel>oka</AlertDialog.Cancel>
							</AlertDialog.Footer>
						</AlertDialog.Content>
					</AlertDialog.Root>
				</div>
			{/if}

			{#if vueloMasAtrasado}
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
			{/if}
		</div>
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
					<tr class="border-b border-neutral-200 dark:border-neutral-700">
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

								<TimeBar
									maxSeconds={vueloMasAtrasado ? vueloMasAtrasado.delta : 43200}
									seconds={vuelo.delta}
								/>
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
				<div class="rounded-lg bg-neutral-100 px-2 py-1 dark:bg-neutral-800">
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
									<Icon icon="lucide-plane-takeoff" class="mr-1 size-4" />
									{delayString(vuelo)}
								{:else if vuelo.json.estes === 'Cancelado'}{/if}
							</span>
						</div>

						{#if vuelo.atda}
							<TimeBar
								maxSeconds={vueloMasAtrasado ? vueloMasAtrasado.delta : 43200}
								seconds={vuelo.delta}
							/>
						{:else if vuelo.json.estes === 'Cancelado'}{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</main>

<Footer />
