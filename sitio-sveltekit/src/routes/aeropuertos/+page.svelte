<script lang="ts">
	// TODO ESTE ARCHIVO ESTA GENERADO POR CURSOR COMPOSER (Claude). CAMINAR CON CUIDADO
	import { formatDuration, intervalToDuration } from 'date-fns';
	import { es } from 'date-fns/locale/es';
	import dayjs from 'dayjs';
	import utc from 'dayjs/plugin/utc';
	import timezone from 'dayjs/plugin/timezone';
	dayjs.extend(utc);
	dayjs.extend(timezone);
	import AIRPORTS_ALIAS from '$lib/aerolineas-airports-subset-alias.json';
	import { getDelayColor } from '$lib/colors';
	import * as Table from '@/components/ui/table';
	import { ArrowUpDown } from 'lucide-svelte';
	import { Button } from '@/components/ui/button';

	type AirlineStats = {
		total_flights: number;
		departed_flights: number;
		cancelled_flights: number;
		delayed_flights: number;
		avg_delay: number;
	};

	type Airport = {
		iata: string;
		total_flights: number;
		departed_flights: number;
		cancelled_flights: number;
		delayed_flights: number;
		total_delay: number;
		avg_delay: number;
		airlines: Record<string, AirlineStats>;
		destinations: string[];
		withoutFlybondi: {
			total_flights: number;
			departed_flights: number;
			cancelled_flights: number;
			delayed_flights: number;
			total_delay: number;
			avg_delay: number;
		};
		delay_improvement: number;
		cancellation_rate: number;
		cancellation_rate_without_flybondi: number;
		delay_rate: number;
		delay_rate_without_flybondi: number;
	};

	export let data;
	$: ({ airports, dateRange } = data);

	function getAirport(iata: string) {
		const airport = AIRPORTS_ALIAS[iata as keyof typeof AIRPORTS_ALIAS];
		if (airport) return airport;
		return iata;
	}

	function formatDelayMinutes(seconds: number) {
		const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
		return formatDuration(duration, { locale: es })
			.replace(' horas', 'hs')
			.replace(' hora', 'h')
			.replace(' minutos', 'min')
			.replace(' minuto', 'min');
	}

	let sortColumn: keyof Airport = 'total_flights';
	let sortDirection: 'asc' | 'desc' = 'desc';

	$: sortedAirports = [...airports].sort((a, b) => {
		const aValue = a[sortColumn];
		const bValue = b[sortColumn];
		return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
	});

	function toggleSort(column: keyof Airport) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'desc';
		}
	}
</script>

<svelte:head>
	<title>Puntualidad por Aeropuerto - failbondi.fail</title>
</svelte:head>

<div
	class="sticky top-0 z-10 mb-4 flex flex-col border-b bg-white px-1 pb-1 text-center sm:px-4 dark:border-neutral-700 dark:bg-neutral-900"
>
	<h1 class="flex items-end justify-center">
		<span class="text-4xl font-medium leading-none text-red-600">failbondi.fail</span>
	</h1>
	<div class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
		Estadísticas del {dayjs(dateRange.start).format('DD/MM/YYYY')} al {dayjs(dateRange.end).format(
			'DD/MM/YYYY'
		)}
	</div>
</div>

<main class="mx-auto max-w-[1200px] p-4">
	<Table.Root class="w-full">
		<Table.Header>
			<Table.Row>
				<Table.Head>Aeropuerto</Table.Head>
				<Table.Head>
					<Button variant="ghost" class="h-8 px-2" on:click={() => toggleSort('total_flights')}>
						<span>Vuelos</span>
						<ArrowUpDown class="ml-2 h-4 w-4" />
					</Button>
				</Table.Head>
				<Table.Head>
					<Button variant="ghost" class="h-8 px-2" on:click={() => toggleSort('delay_improvement')}>
						<span>Mejora en retrasos</span>
						<ArrowUpDown class="ml-2 h-4 w-4" />
					</Button>
				</Table.Head>
				<Table.Head>
					<Button variant="ghost" class="h-8 px-2" on:click={() => toggleSort('avg_delay')}>
						<span>Retraso promedio</span>
						<ArrowUpDown class="ml-2 h-4 w-4" />
					</Button>
				</Table.Head>
				<Table.Head>
					<Button variant="ghost" class="h-8 px-2" on:click={() => toggleSort('delay_rate')}>
						<span>% Vuelos retrasados</span>
						<ArrowUpDown class="ml-2 h-4 w-4" />
					</Button>
				</Table.Head>
				<Table.Head>
					<Button variant="ghost" class="h-8 px-2" on:click={() => toggleSort('cancellation_rate')}>
						<span>% Vuelos cancelados</span>
						<ArrowUpDown class="ml-2 h-4 w-4" />
					</Button>
				</Table.Head>
				<Table.Head>Destinos</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each sortedAirports as airport}
				<Table.Row>
					<Table.Cell class="font-medium">{getAirport(airport.iata)}</Table.Cell>
					<Table.Cell>
						<div class="space-y-1">
							<div>Total: {airport.total_flights}</div>
							<div class="text-sm text-neutral-500">
								FB: {airport.total_flights - airport.withoutFlybondi.total_flights} | Otros: {airport
									.withoutFlybondi.total_flights}
							</div>
						</div>
					</Table.Cell>
					<Table.Cell>
						<span class={getDelayColor(airport.delay_improvement, true)}>
							{airport.delay_improvement > 0
								? `${formatDelayMinutes(airport.delay_improvement)} peor`
								: `${formatDelayMinutes(Math.abs(airport.delay_improvement))} mejor`}
						</span>
					</Table.Cell>
					<Table.Cell>
						<div class="space-y-1">
							<div>
								Con FB: <span class={getDelayColor(airport.avg_delay, true)}
									>{formatDelayMinutes(airport.avg_delay)}</span
								>
							</div>
							<div>
								Sin FB: <span class={getDelayColor(airport.withoutFlybondi.avg_delay, true)}
									>{formatDelayMinutes(airport.withoutFlybondi.avg_delay)}</span
								>
							</div>
						</div>
					</Table.Cell>
					<Table.Cell>
						<div class="space-y-1">
							<div>Con FB: {airport.delay_rate.toFixed(1)}%</div>
							<div>Sin FB: {airport.delay_rate_without_flybondi.toFixed(1)}%</div>
						</div>
					</Table.Cell>
					<Table.Cell>
						<div class="space-y-1">
							<div>Con FB: {airport.cancellation_rate.toFixed(1)}%</div>
							<div>Sin FB: {airport.cancellation_rate_without_flybondi.toFixed(1)}%</div>
						</div>
					</Table.Cell>
					<Table.Cell class="max-w-[200px] truncate">
						{airport.destinations.map((d: string) => getAirport(d)).join(', ')}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</main>

<footer
	class="mt-10 flex flex-col items-center justify-center px-4 text-center text-sm text-neutral-600 dark:text-neutral-400"
>
	<p class="prose prose-neutral dark:prose-invert mb-4 max-w-[800px]">
		La marca Flybondi es de FB Líneas Aéreas S.A. Este sitio web no está afiliado, respaldado ni
		patrocinado por FB Líneas Aéreas S.A. Todos los derechos asociados a la marca y su uso están
		reservados a su propietario legítimo. El uso de la marca en este sitio es únicamente
		informativo. No nos hacemos responsables de los errores que puedan haber en la información
		presentada.
	</p>

	<div class="prose prose-neutral dark:prose-invert mb-4 flex max-w-[800px] flex-col gap-2">
		<p class="my-0">
			Failbondi.fail es un experimento de <a href="https://nulo.lol">Nulo Science Inc™</a>.
		</p>

		<a href="/acerca">Acerca del sitio, sus datos, etc</a>

		<a href="https://x.com/esoesnulo">@esoesnulo</a>
	</div>
</footer>
