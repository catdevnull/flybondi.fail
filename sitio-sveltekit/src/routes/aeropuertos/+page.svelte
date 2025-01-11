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
	import Footer from '$lib/components/footer.svelte';
	import TimeBar from '../time-bar.svelte';

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
		// Round down to minutes
		seconds = Math.floor(seconds / 60) * 60;
		const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
		return formatDuration(duration, { locale: es })
			.replace(' horas', 'h')
			.replace(' hora', 'h')
			.replace(' minutos', 'min')
			.replace(' minuto', 'min')
			.replace(' segundos', 's')
			.replace(' segundo', 's');
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
	<!-- Desktop Table View -->
	<div class="hidden sm:block">
		<Table.Root class="w-full">
			<Table.Header>
				<Table.Row>
					<Table.Head>Aeropuerto</Table.Head>
					<Table.Head>
						<Button variant="ghost" class="h-8 px-2" on:click={() => toggleSort('total_flights')}>
							<span>Vuelos (30d)</span>
							<ArrowUpDown class="ml-2 h-4 w-4" />
						</Button>
					</Table.Head>
					<Table.Head>
						<Button variant="ghost" class="h-8 px-2" on:click={() => toggleSort('delay_rate')}>
							<span>Retrasos</span>
							<ArrowUpDown class="ml-2 h-4 w-4" />
						</Button>
					</Table.Head>
					<Table.Head>
						<Button
							variant="ghost"
							class="h-8 px-2"
							on:click={() => toggleSort('cancellation_rate')}
						>
							<span>Cancelaciones</span>
							<ArrowUpDown class="ml-2 h-4 w-4" />
						</Button>
					</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each sortedAirports as airport}
					<Table.Row>
						<Table.Cell class="font-medium">{getAirport(airport.iata)}</Table.Cell>
						<Table.Cell>
							<div class="space-y-0.5">
								<div class="font-medium">{airport.total_flights}</div>
								<div class="text-xs text-neutral-500">
									FB: {airport.total_flights - airport.withoutFlybondi.total_flights} | Otros: {airport
										.withoutFlybondi.total_flights}
								</div>
							</div>
						</Table.Cell>
						<Table.Cell class="py-2">
							<div class="space-y-2">
								<div>
									Con FB: <span class="font-medium">{airport.delay_rate.toFixed(1)}%</span>
									<span class="text-xs {getDelayColor(airport.avg_delay, true)}">
										({formatDelayMinutes(airport.avg_delay)})
									</span>
									<TimeBar maxSeconds={3600} seconds={airport.avg_delay} />
								</div>
								<div>
									Sin FB: <span class="font-medium"
										>{airport.delay_rate_without_flybondi.toFixed(1)}%</span
									>
									<span class="text-xs {getDelayColor(airport.withoutFlybondi.avg_delay, true)}">
										({formatDelayMinutes(airport.withoutFlybondi.avg_delay)})
									</span>
									<TimeBar maxSeconds={3600} seconds={airport.withoutFlybondi.avg_delay} />
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="space-y-0.5">
								<div>
									Con FB: <span class="font-medium">{airport.cancellation_rate.toFixed(1)}%</span>
								</div>
								<div class="text-sm">
									Sin FB: <span class="font-medium"
										>{airport.cancellation_rate_without_flybondi.toFixed(1)}%</span
									>
								</div>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Mobile Card View -->
	<div class="grid grid-cols-1 gap-2 sm:hidden">
		{#each sortedAirports as airport}
			<div class="rounded-lg border bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium">{getAirport(airport.iata)}</h3>
					<div class="text-right">
						<div class="font-medium">{airport.total_flights} vuelos</div>
						<div class="text-xs text-neutral-500">
							FB: {airport.total_flights - airport.withoutFlybondi.total_flights} | Otros: {airport
								.withoutFlybondi.total_flights}
						</div>
					</div>
				</div>

				<div class="mt-2 space-y-2">
					<div>
						<div class="text-sm font-medium">Retrasos:</div>
						<div class="space-y-2">
							<div>
								Con FB: <span class="font-medium">{airport.delay_rate.toFixed(1)}%</span>
								<span class="text-xs {getDelayColor(airport.avg_delay, true)}">
									({formatDelayMinutes(airport.avg_delay)})
								</span>
								<TimeBar maxSeconds={3600} seconds={airport.avg_delay} />
							</div>
							<div>
								Sin FB: <span class="font-medium"
									>{airport.delay_rate_without_flybondi.toFixed(1)}%</span
								>
								<span class="text-xs {getDelayColor(airport.withoutFlybondi.avg_delay, true)}">
									({formatDelayMinutes(airport.withoutFlybondi.avg_delay)})
								</span>
								<TimeBar maxSeconds={3600} seconds={airport.withoutFlybondi.avg_delay} />
							</div>
						</div>
					</div>

					<div>
						<div class="text-sm font-medium">Cancelaciones:</div>
						<div class="space-y-0.5">
							<div>
								Con FB: <span class="font-medium">{airport.cancellation_rate.toFixed(1)}%</span>
							</div>
							<div class="text-sm">
								Sin FB: <span class="font-medium"
									>{airport.cancellation_rate_without_flybondi.toFixed(1)}%</span
								>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</main>

<Footer>
	<a href="/">Ver datos de hoy</a>
</Footer>
