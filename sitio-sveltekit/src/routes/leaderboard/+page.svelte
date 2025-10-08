<script lang="ts">
	import dayjs from 'dayjs';
	import utc from 'dayjs/plugin/utc';
	import timezone from 'dayjs/plugin/timezone';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { CalendarIcon } from 'lucide-svelte';
	import { today, getLocalTimeZone, CalendarDate } from '@internationalized/date';
	import type { DateRange } from 'bits-ui';
	import * as Popover from '@/components/ui/popover';
	import * as RangeCalendar from '@/components/ui/range-calendar';
	import { Button } from '@/components/ui/button';
	import * as Table from '@/components/ui/table';
	import Footer from '@/components/footer.svelte';
	import cardPath from '$lib/assets/twitter-card.png';
	import { IATA_NAMES } from '@/aerolineas';
	import { onMount } from 'svelte';
	import { MIN_LEADERBOARD_FLIGHTS } from './config';

	dayjs.extend(utc);
	dayjs.extend(timezone);

	type LeaderboardEntry = {
		airline: string;
		total_flights: number;
		cancelled_flights: number;
		completed_flights: number;
		avg_delay_minutes: number | null;
		on_time_flights: number;
		very_delayed_flights: number;
		on_time_percentage: number | null;
		cancel_percentage: number | null;
	};

	export let data: {
		leaderboard: LeaderboardEntry[];
		period: { start: string; end: string };
		hasCustomDate: boolean;
	};

	const tz = 'America/Argentina/Buenos_Aires';

	let leaderboard: LeaderboardEntry[] = [];
	$: leaderboard = data.leaderboard.map((entry) => ({
		...entry,
		avg_delay_minutes:
			typeof entry.avg_delay_minutes === 'number'
				? entry.avg_delay_minutes
				: entry.avg_delay_minutes !== null
					? Number(entry.avg_delay_minutes)
					: null,
		on_time_percentage:
			typeof entry.on_time_percentage === 'number'
				? entry.on_time_percentage
				: entry.on_time_percentage !== null
					? Number(entry.on_time_percentage)
					: null,
		cancel_percentage:
			typeof entry.cancel_percentage === 'number'
				? entry.cancel_percentage
				: entry.cancel_percentage !== null
					? Number(entry.cancel_percentage)
					: null
	}));

	let bestAirline: LeaderboardEntry | undefined;
	let worstAirline: LeaderboardEntry | undefined;
	$: worstAirline = leaderboard.find((entry) => entry.avg_delay_minutes !== null);
	$: bestAirline = [...leaderboard].reverse().find((entry) => entry.avg_delay_minutes !== null);

	let timeRangeLabel = '';
	$: timeRangeLabel = `${dayjs(data.period.start).tz(tz).format('DD/MM/YYYY')} - ${dayjs(
		data.period.end
	)
		.tz(tz)
		.format('DD/MM/YYYY')}`;

	function toCalendarDate(iso: string) {
		const [year, month, day] = dayjs(iso).tz(tz).format('YYYY-M-D').split('-').map(Number) as [
			number,
			number,
			number
		];
		return new CalendarDate(year, month, day);
	}

	let startDate = toCalendarDate(data.period.start);
	let endDate = toCalendarDate(data.period.end);
	let dateRange: DateRange = {
		start: startDate,
		end: endDate
	};
	let currentPeriod = { start: data.period.start, end: data.period.end };
	$: if (
		data?.period &&
		(currentPeriod.start !== data.period.start || currentPeriod.end !== data.period.end)
	) {
		currentPeriod = { start: data.period.start, end: data.period.end };
		startDate = toCalendarDate(data.period.start);
		endDate = toCalendarDate(data.period.end);
		dateRange = { start: startDate, end: endDate };
	}

	let calendarMonths = 2;

	onMount(() => {
		if (browser) {
			const mq = window.matchMedia('(max-width: 640px)');
			calendarMonths = mq.matches ? 1 : 2;
			mq.addEventListener('change', (event) => {
				calendarMonths = event.matches ? 1 : 2;
			});
		}
	});

	function onDateSelect(range: DateRange) {
		if (range && range.start && range.end) {
			dateRange = range;
			startDate = new CalendarDate(range.start.year, range.start.month, range.start.day);
			endDate = new CalendarDate(range.end.year, range.end.month, range.end.day);
			if (browser) {
				const path = window.location.pathname;
				const params = new URLSearchParams(window.location.search);
				params.set('start', dayjs(range.start.toDate(tz)).tz(tz).format('YYYY-MM-DD'));
				params.set('end', dayjs(range.end.toDate(tz)).tz(tz).format('YYYY-MM-DD'));
				const query = params.toString();
				const target = query ? `${path}?${query}` : path;
				goto(target, { replaceState: true, keepFocus: true, noScroll: true });
			}
		}
	}

	function resetRange() {
		if (browser) {
			const defaultEnd = dayjs().tz(tz).subtract(1, 'day').endOf('day');
			const defaultStart = defaultEnd.clone().subtract(179, 'day').startOf('day');
			startDate = toCalendarDate(defaultStart.toISOString());
			endDate = toCalendarDate(defaultEnd.toISOString());
			dateRange = { start: startDate, end: endDate };
			currentPeriod = { start: defaultStart.toISOString(), end: defaultEnd.toISOString() };
			const path = window.location.pathname;
			const params = new URLSearchParams(window.location.search);
			params.delete('start');
			params.delete('end');
			const query = params.toString();
			const target = query ? `${path}?${query}` : path;
			goto(target, { replaceState: true, keepFocus: true, noScroll: true });
		}
	}

	function airlineName(code: string) {
		return IATA_NAMES[code as keyof typeof IATA_NAMES] ?? code;
	}

	function formatDelay(delay: number | null) {
		if (delay === null || Number.isNaN(delay)) return '—';
		return `${delay.toFixed(1)} min`;
	}

	function formatPercent(value: number | null) {
		if (value === null || Number.isNaN(value)) return '—';
		return `${value.toFixed(1)}%`;
	}

	function clampPercentage(value: number | null) {
		if (value === null || Number.isNaN(value)) return 0;
		return Math.min(Math.max(value, 0), 100);
	}

	function cancelStyle(value: number | null) {
		const pctRaw = clampPercentage(value);
		const pct = Math.min(pctRaw, 10) / 10; // treat 10% as worst case
		const hue = 120 - pct * 120;
		const lightness = 94 - pct * 40;
		const background = `hsl(${hue}, 85%, ${lightness}%)`;
		const textColor = pct > 0.3 ? '#7f1d1d' : '#0f5132';
		return `background-color: ${background}; color: ${textColor};`;
	}

	function delayStyle(value: number | null) {
		if (value === null || Number.isNaN(value)) return '';
		const capped = Math.min(Math.max(value, 0), 120);
		const pct = capped / 120;
		const hue = 120 - pct * 120;
		const lightness = 96 - pct * 40;
		const background = `hsl(${hue}, 80%, ${lightness}%)`;
		const textColor = pct > 0.5 ? '#7f1d1d' : '#0f5132';
		return `background-color: ${background}; color: ${textColor};`;
	}

	let metaTitle = '';
	let metaDescription = '';
	$: metaTitle = `Ranking de aerolíneas por puntualidad (${timeRangeLabel}) - failbondi.fail`;
	$: metaDescription =
		bestAirline && worstAirline
			? `${airlineName(bestAirline.airline)} tuvo el mejor desempeño (${formatPercent(
					bestAirline.on_time_percentage
				)} puntuales) y ${airlineName(worstAirline.airline)} el peor (${formatDelay(
					worstAirline.avg_delay_minutes
				)} de retraso promedio) entre ${timeRangeLabel}.`
			: `Revisa el ranking de puntualidad y cancelaciones de todas las aerolíneas entre ${timeRangeLabel}.`;
</script>

<svelte:head>
	<title>{metaTitle}</title>
	<meta name="description" content={metaDescription} />

	<meta property="og:type" content="website" />
	<meta property="og:title" content={metaTitle} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content="https://failbondi.fail/leaderboard" />
	<meta property="og:image" content={'https://failbondi.fail' + cardPath} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@esoesnulo" />
	<meta name="twitter:title" content={metaTitle} />
	<meta name="twitter:description" content={metaDescription} />
	<meta name="twitter:url" content="https://failbondi.fail/leaderboard" />
	<meta name="twitter:image" content={'https://failbondi.fail' + cardPath} />
</svelte:head>

<div
	class="sticky top-0 z-10 mb-4 flex flex-col border-b bg-white px-1 pb-3 text-center sm:px-4 dark:border-neutral-700 dark:bg-neutral-900"
>
	<h1 class="flex items-end justify-center">
		<span class="text-4xl font-medium leading-none text-red-600">failbondi.fail</span>
	</h1>
	<div class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
		Ranking de aerolíneas del {dayjs(data.period.start).tz(tz).format('DD/MM/YYYY')} al
		{dayjs(data.period.end).tz(tz).format('DD/MM/YYYY')}
	</div>
	<div class="mt-3 flex flex-wrap items-center justify-center gap-3">
		<Popover.Root>
			<Popover.Trigger asChild>
				<Button variant="outline" class="flex items-center gap-2">
					<CalendarIcon class="h-4 w-4" />
					<span
						>{dayjs(startDate.toDate(tz)).format('DD/MM/YYYY')} - {dayjs(endDate.toDate(tz)).format(
							'DD/MM/YYYY'
						)}</span
					>
				</Button>
			</Popover.Trigger>
			<Popover.Content class="w-auto p-0">
				<RangeCalendar.RangeCalendar
					value={dateRange}
					numberOfMonths={calendarMonths}
					onValueChange={onDateSelect}
					minValue={today(getLocalTimeZone()).subtract({ years: 2 })}
					maxValue={today(getLocalTimeZone())}
				/>
			</Popover.Content>
		</Popover.Root>
		{#if data.hasCustomDate}
			<Button variant="ghost" class="text-sm" on:click={resetRange}>Últimos 180 días</Button>
		{/if}
	</div>
</div>

<main class="mx-auto flex max-w-5xl flex-col gap-4 p-3 sm:p-4">
	<section class="grid grid-cols-1 gap-3 sm:grid-cols-2">
		<div
			class="flex flex-col gap-1 rounded-lg border border-emerald-200/70 bg-emerald-50 p-3 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-900/20"
		>
			<p class="text-sm text-neutral-500 dark:text-neutral-400">Mejor puntualidad</p>
			{#if bestAirline}
				<h2 class="text-lg font-semibold">{airlineName(bestAirline.airline)}</h2>
				<p class="text-sm leading-none text-neutral-600 dark:text-neutral-400">
					{bestAirline.on_time_flights.toLocaleString('es-AR')} vuelos puntuales
				</p>
				<p class="text-sm leading-none text-neutral-600 dark:text-neutral-400">
					Retraso promedio {formatDelay(bestAirline.avg_delay_minutes)}
				</p>
			{:else}
				<p class="text-sm leading-none text-neutral-600 dark:text-neutral-400">
					Sin datos suficientes.
				</p>
			{/if}
		</div>
		<div
			class="rounded-lg border border-rose-200/70 bg-rose-50 p-3 shadow-sm dark:border-rose-400/30 dark:bg-rose-900/20"
		>
			<p class="text-sm text-neutral-500 dark:text-neutral-400">Mayor demora</p>
			{#if worstAirline}
				<h2 class="mt-1 text-lg font-semibold">{airlineName(worstAirline.airline)}</h2>
				<p class="text-sm text-neutral-600 dark:text-neutral-400">
					Retraso promedio {formatDelay(worstAirline.avg_delay_minutes)}
				</p>
				<p
					class="mt-1 inline-block rounded-sm px-1 py-0.5 text-sm font-medium text-neutral-700 dark:text-neutral-300"
					style={cancelStyle(worstAirline.cancel_percentage)}
				>
					Cancelaciones {worstAirline.cancelled_flights} ({formatPercent(
						worstAirline.cancel_percentage
					)})
				</p>
			{:else}
				<p class="text-sm text-neutral-600 dark:text-neutral-400">Sin datos suficientes.</p>
			{/if}
		</div>
	</section>

	<section class="space-y-3">
		<h2 class="text-2xl font-semibold">Leaderboard</h2>
		<div
			class="hidden rounded-lg border border-neutral-200 bg-white shadow-sm sm:block dark:border-neutral-700 dark:bg-neutral-900"
		>
			<Table.Table class="w-full text-sm">
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-10 text-center">#</Table.Head>
						<Table.Head>Aerolínea</Table.Head>
						<Table.Head class="text-right">Vuelos</Table.Head>
						<Table.Head class="text-right">Puntuales ≤15m</Table.Head>
						<Table.Head class="text-right">Retraso prom.</Table.Head>
						<Table.Head class="text-right">Cancelaciones</Table.Head>
						<Table.Head class="text-right">Retrasos &gt;60m</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if leaderboard.length === 0}
						<Table.Row>
							<Table.Cell colspan={7} class="py-6 text-center text-sm text-neutral-500">
								No encontramos datos para este rango de fechas.
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each leaderboard as entry, index}
							<Table.Row class="text-sm">
								<Table.Cell class="text-center font-medium">{index + 1}</Table.Cell>
								<Table.Cell class="font-semibold">{airlineName(entry.airline)}</Table.Cell>
								<Table.Cell class="text-right tabular-nums"
									>{entry.total_flights.toLocaleString('es-AR')}</Table.Cell
								>
								<Table.Cell class="text-right tabular-nums">
									{entry.on_time_flights.toLocaleString('es-AR')}
								</Table.Cell>
								<Table.Cell
									class="px-2 py-1 text-right font-medium tabular-nums"
									style={delayStyle(entry.avg_delay_minutes)}
								>
									{formatDelay(entry.avg_delay_minutes)}
								</Table.Cell>
								<Table.Cell
									class="px-2 py-1 text-right font-medium tabular-nums"
									style={cancelStyle(entry.cancel_percentage)}
								>
									{entry.cancelled_flights.toLocaleString('es-AR')} ({formatPercent(
										entry.cancel_percentage
									)})
								</Table.Cell>
								<Table.Cell class="text-right tabular-nums"
									>{entry.very_delayed_flights.toLocaleString('es-AR')}</Table.Cell
								>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Table>
		</div>

		<div class="flex flex-col gap-3 sm:hidden">
			{#if leaderboard.length === 0}
				<div
					class="rounded-lg border border-neutral-200 bg-white p-3 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
				>
					No encontramos datos para este rango de fechas.
				</div>
			{:else}
				{#each leaderboard as entry, index}
					<div
						class="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
					>
						<div class="flex items-baseline justify-between text-sm">
							<h3 class="font-semibold">{index + 1}. {airlineName(entry.airline)}</h3>
						</div>
						<div class="mt-2 flex justify-between gap-2 text-xs">
							<div>
								<p class="text-neutral-500 dark:text-neutral-400">Vuelos</p>
								<p class="font-medium">{entry.total_flights.toLocaleString('es-AR')}</p>
							</div>
							<div>
								<p class="text-neutral-500 dark:text-neutral-400">Puntuales</p>
								<p class="font-medium">{entry.on_time_flights.toLocaleString('es-AR')}</p>
							</div>
							<div>
								<p class="text-neutral-500 dark:text-neutral-400">Retraso prom.</p>
								<p class="rounded-sm px-1 font-medium" style={delayStyle(entry.avg_delay_minutes)}>
									{formatDelay(entry.avg_delay_minutes)}
								</p>
							</div>
							<div>
								<p class="text-neutral-500 dark:text-neutral-400">Cancelaciones</p>
								<p class="rounded-sm px-1 font-medium" style={cancelStyle(entry.cancel_percentage)}>
									{entry.cancelled_flights.toLocaleString('es-AR')} ({formatPercent(
										entry.cancel_percentage
									)})
								</p>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>

	<p
		class="mt-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-400/40 dark:bg-amber-900/20 dark:text-amber-200"
	>
		Mostramos únicamente aerolíneas con más de {MIN_LEADERBOARD_FLIGHTS.toLocaleString('es-AR')} vuelos
		en el período seleccionado para asegurar comparaciones justas.
	</p>
</main>

<Footer />
