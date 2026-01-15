<script lang="ts">
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
	import { ArrowUpDown, Search } from 'lucide-svelte';
	import { Button } from '@/components/ui/button';
	import Footer from '$lib/components/footer.svelte';
	import TimeBar from '../time-bar.svelte';
	import cardPath from '$lib/assets/twitter-card.png';

	type Route = {
		origin: string;
		destination: string;
		total_flights: number;
		flybondi_flights: number;
		others_flights: number;
		flybondi_departed: number;
		others_departed: number;
		flybondi_avg_delay: number | null;
		others_avg_delay: number | null;
		flybondi_delay_rate: number | null;
		others_delay_rate: number | null;
	};

	export let data;
	$: ({ routes, dateRange } = data);

	function getAirport(iata: string) {
		const airport = AIRPORTS_ALIAS[iata as keyof typeof AIRPORTS_ALIAS];
		if (airport) return airport;
		return iata;
	}

	function formatDelayMinutes(seconds: number | null) {
		if (seconds === null) return '-';
		seconds = Math.floor(seconds / 60) * 60;
		const duration = intervalToDuration({ start: 0, end: Math.abs(seconds) * 1000 });
		const formatted = formatDuration(duration, { locale: es })
			.replace(' horas', 'h')
			.replace(' hora', 'h')
			.replace(' minutos', 'min')
			.replace(' minuto', 'min')
			.replace(' segundos', 's')
			.replace(' segundo', 's');
		return formatted || '0s';
	}

	type SortColumn = 'route' | 'total_flights' | 'flybondi_avg_delay' | 'others_avg_delay';
	let sortColumn: SortColumn = 'total_flights';
	let sortDirection: 'asc' | 'desc' = 'desc';
	let searchQuery = '';

	function normalize(str: string) {
		return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	}

	$: filteredRoutes = (routes as unknown as Route[]).filter((route) => {
		if (!searchQuery.trim()) return true;
		const query = normalize(searchQuery);
		const origin = normalize(getAirport(route.origin));
		const destination = normalize(getAirport(route.destination));
		const originCode = route.origin.toLowerCase();
		const destCode = route.destination.toLowerCase();
		return (
			origin.includes(query) ||
			destination.includes(query) ||
			originCode.includes(query) ||
			destCode.includes(query)
		);
	});

	$: sortedRoutes = ([...filteredRoutes]).sort((a, b) => {
		let aValue: number;
		let bValue: number;

		switch (sortColumn) {
			case 'route':
				const aRoute = `${a.origin}-${a.destination}`;
				const bRoute = `${b.origin}-${b.destination}`;
				return sortDirection === 'asc' ? aRoute.localeCompare(bRoute) : bRoute.localeCompare(aRoute);
			case 'total_flights':
				aValue = a.total_flights;
				bValue = b.total_flights;
				break;
			case 'flybondi_avg_delay':
				aValue = a.flybondi_avg_delay ?? -Infinity;
				bValue = b.flybondi_avg_delay ?? -Infinity;
				break;
			case 'others_avg_delay':
				aValue = a.others_avg_delay ?? -Infinity;
				bValue = b.others_avg_delay ?? -Infinity;
				break;
			default:
				aValue = 0;
				bValue = 0;
		}
		return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
	});

	function toggleSort(column: SortColumn) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'desc';
		}
	}

	$: metaTitle = `Ranking de Rutas por Puntualidad - failbondi.fail`;
	$: metaDescription = 'Comparación de puntualidad por ruta entre Flybondi y otras aerolíneas.';
</script>

<svelte:head>
	<title>{metaTitle}</title>
	<meta name="description" content={metaDescription} />

	<meta property="og:type" content="website" />
	<meta property="og:title" content={metaTitle} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content="https://failbondi.fail/rutas" />
	<meta property="og:image" content={'https://failbondi.fail' + cardPath} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@esoesnulo" />
	<meta name="twitter:title" content={metaTitle} />
	<meta name="twitter:description" content={metaDescription} />
	<meta name="twitter:url" content="https://failbondi.fail/rutas" />
	<meta name="twitter:image" content={'https://failbondi.fail' + cardPath} />
</svelte:head>

<div
	class="sticky top-0 z-10 mb-4 flex flex-col border-b bg-white px-1 pb-1 text-center sm:px-4 dark:border-neutral-700 dark:bg-neutral-900"
>
	<h1 class="flex items-end justify-center">
		<span class="text-4xl font-medium leading-none text-red-600">failbondi.fail</span>
	</h1>
	<div class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
		Estadísticas por ruta del {dayjs(dateRange.start).format('DD/MM/YYYY')} al {dayjs(dateRange.end).format('DD/MM/YYYY')}
	</div>
	<div class="mt-2 flex justify-center">
		<div class="relative w-full max-w-xs">
			<Search class="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
			<input
				type="text"
				placeholder="Buscar ruta..."
				bind:value={searchQuery}
				class="w-full rounded-md border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
			/>
		</div>
	</div>
</div>

<main class="mx-auto max-w-[1200px] p-4">
	<!-- Desktop Table View -->
	<div class="hidden sm:block">
		<Table.Root class="w-full">
			<Table.Header>
				<Table.Row>
					<Table.Head>
						<Button variant="ghost" class="h-8 px-2" on:click={() => toggleSort('route')}>
							<span>Ruta</span>
							<ArrowUpDown class="ml-2 h-4 w-4" />
						</Button>
					</Table.Head>
					<Table.Head>
						<Button variant="ghost" class="h-8 px-2" on:click={() => toggleSort('total_flights')}>
							<span>Vuelos (30d)</span>
							<ArrowUpDown class="ml-2 h-4 w-4" />
						</Button>
					</Table.Head>
					<Table.Head>
						<Button variant="ghost" class="h-8 px-2" on:click={() => toggleSort('flybondi_avg_delay')}>
							<span>Flybondi</span>
							<ArrowUpDown class="ml-2 h-4 w-4" />
						</Button>
					</Table.Head>
					<Table.Head>
						<Button variant="ghost" class="h-8 px-2" on:click={() => toggleSort('others_avg_delay')}>
							<span>Otras aerolíneas</span>
							<ArrowUpDown class="ml-2 h-4 w-4" />
						</Button>
					</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each sortedRoutes as route}
					<Table.Row>
						<Table.Cell class="font-medium">
							{getAirport(route.origin)} → {getAirport(route.destination)}
						</Table.Cell>
						<Table.Cell>
							<div class="space-y-0.5">
								<div class="font-medium">{route.total_flights}</div>
								<div class="text-xs text-neutral-500">
									FB: {route.flybondi_flights} | Otros: {route.others_flights}
								</div>
							</div>
						</Table.Cell>
						<Table.Cell class="py-2">
							{#if route.flybondi_departed > 0}
								<div class="space-y-1">
									<div>
										<span class="font-medium {getDelayColor(route.flybondi_avg_delay ?? 0, true)}">
											{formatDelayMinutes(route.flybondi_avg_delay)}
										</span>
									</div>
									<TimeBar maxSeconds={7200} seconds={route.flybondi_avg_delay ?? 0} />
									<div class="text-xs text-neutral-500">
										{route.flybondi_delay_rate?.toFixed(1)}% retrasados
									</div>
								</div>
							{:else}
								<span class="text-neutral-400">-</span>
							{/if}
						</Table.Cell>
						<Table.Cell class="py-2">
							{#if route.others_departed > 0}
								<div class="space-y-1">
									<div>
										<span class="font-medium {getDelayColor(route.others_avg_delay ?? 0, true)}">
											{formatDelayMinutes(route.others_avg_delay)}
										</span>
									</div>
									<TimeBar maxSeconds={7200} seconds={route.others_avg_delay ?? 0} />
									<div class="text-xs text-neutral-500">
										{route.others_delay_rate?.toFixed(1)}% retrasados
									</div>
								</div>
							{:else}
								<span class="text-neutral-400">-</span>
							{/if}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Mobile Card View -->
	<div class="grid grid-cols-1 gap-2 sm:hidden">
		{#each sortedRoutes as route}
			<div class="rounded-lg border bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium">
						{getAirport(route.origin)} → {getAirport(route.destination)}
					</h3>
					<div class="text-right">
						<div class="font-medium">{route.total_flights} vuelos</div>
						<div class="text-xs text-neutral-500">
							FB: {route.flybondi_flights} | Otros: {route.others_flights}
						</div>
					</div>
				</div>

				<div class="mt-2 grid grid-cols-2 gap-2">
					<div>
						<div class="text-sm font-medium">Flybondi:</div>
						{#if route.flybondi_departed > 0}
							<div class="space-y-1">
								<div class={getDelayColor(route.flybondi_avg_delay ?? 0, true)}>
									{formatDelayMinutes(route.flybondi_avg_delay)}
								</div>
								<TimeBar maxSeconds={7200} seconds={route.flybondi_avg_delay ?? 0} />
								<div class="text-xs text-neutral-500">
									{route.flybondi_delay_rate?.toFixed(1)}% retrasados
								</div>
							</div>
						{:else}
							<span class="text-neutral-400">-</span>
						{/if}
					</div>
					<div>
						<div class="text-sm font-medium">Otras:</div>
						{#if route.others_departed > 0}
							<div class="space-y-1">
								<div class={getDelayColor(route.others_avg_delay ?? 0, true)}>
									{formatDelayMinutes(route.others_avg_delay)}
								</div>
								<TimeBar maxSeconds={7200} seconds={route.others_avg_delay ?? 0} />
								<div class="text-xs text-neutral-500">
									{route.others_delay_rate?.toFixed(1)}% retrasados
								</div>
							</div>
						{:else}
							<span class="text-neutral-400">-</span>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</main>

<div class="prose prose-neutral dark:prose-invert mx-auto max-w-[1200px] p-4">
	<h2>Metodología</h2>
	<p>
		Para cada ruta se compara el promedio de demora de Flybondi contra el promedio de todas las demás 
		aerolíneas combinadas. Solo se muestran rutas donde opera Flybondi.
	</p>
</div>

<Footer />
