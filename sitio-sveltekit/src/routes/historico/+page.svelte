<script lang="ts">
	import dayjs from 'dayjs';
	import utc from 'dayjs/plugin/utc';
	import timezone from 'dayjs/plugin/timezone';
	dayjs.extend(utc);
	dayjs.extend(timezone);
	import {
		Chart,
		type ChartConfiguration,
		type ChartEvent,
		type TooltipItem,
		type Point,
		type Scale,
		type CoreScaleOptions,
		type Tick
	} from 'chart.js';
	import 'chart.js/auto';
	import { registerables } from 'chart.js';
	import 'chartjs-adapter-date-fns';
	Chart.register(...registerables);
	import { AIRLINE_COLORS } from '@/colors';
	import { Button } from '@/components/ui/button';
	import * as RangeCalendar from '@/components/ui/range-calendar';
	import * as Popover from '@/components/ui/popover';
	import { CalendarIcon } from 'lucide-svelte';
	import Footer from '@/components/footer.svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { today, getLocalTimeZone, CalendarDate } from '@internationalized/date';
	import type { DateRange } from 'bits-ui';
	import { onMount, onDestroy } from 'svelte';

	export let data: {
		dailyStats: Array<{
			date: string;
			airline: string;
			avgDelay: number;
			cancelPercentage: number;
		}>;
		hasCustomDate: boolean;
		availableDates: string[];
	};

	let isMobile = false;
	let mediaQuery: MediaQueryList;

	onMount(() => {
		if (browser) {
			mediaQuery = window.matchMedia('(max-width: 639px)');
			isMobile = mediaQuery.matches;

			const handleChange = (e: MediaQueryListEvent) => {
				isMobile = e.matches;
				if (delayChartEl && cancelChartEl) {
					updateCharts();
				}
			};

			mediaQuery.addEventListener('change', handleChange);

			return () => {
				mediaQuery.removeEventListener('change', handleChange);
			};
		}
	});

	const AEROLINEAS = {
		FO: 'Flybondi',
		AR: 'Aerolíneas Argentinas',
		WJ: 'JetSmart',
		G3: 'GOL',
		JJ: 'TAM',
		O4: 'Andes L.A.',
		'5U': 'TAG',
		ZP: 'Paranair',
		H2: 'SKY'
	};

	let startDate =
		browser && new URLSearchParams(window.location.search).has('start')
			? new CalendarDate(
					...(dayjs(new URLSearchParams(window.location.search).get('start'))
						.format('YYYY-MM-DD')
						.split('-')
						.map(Number) as [number, number, number])
				)
			: today(getLocalTimeZone()).subtract({ months: 1 });
	let endDate =
		browser && new URLSearchParams(window.location.search).has('end')
			? new CalendarDate(
					...(dayjs(new URLSearchParams(window.location.search).get('end'))
						.format('YYYY-MM-DD')
						.split('-')
						.map(Number) as [number, number, number])
				)
			: today(getLocalTimeZone());
	let dateRange = {
		start: startDate,
		end: endDate
	};

	let delayChartEl: HTMLCanvasElement;
	let cancelChartEl: HTMLCanvasElement;
	let delayChart: Chart;
	let cancelChart: Chart;

	function formatDate(date: Date) {
		return dayjs(date).format('DD/MM/YYYY');
	}

	const tsz = 'America/Argentina/Buenos_Aires';

	function onDateSelect(range: DateRange) {
		if (range && range.start && range.end) {
			startDate = new CalendarDate(range.start.year, range.start.month, range.start.day);
			endDate = new CalendarDate(range.end.year, range.end.month, range.end.day);
			dateRange = {
				start: startDate,
				end: endDate
			};
			if (browser) {
				const params = new URLSearchParams(window.location.search);
				params.set(
					'start',
					dayjs(range.start.toDate('America/Argentina/Buenos_Aires')).format('YYYY-MM-DD')
				);
				params.set(
					'end',
					dayjs(range.end.toDate('America/Argentina/Buenos_Aires')).format('YYYY-MM-DD')
				);
				goto(`?${params.toString()}`, { replaceState: true });
			}
		}
	}

	function updateCharts() {
		if (!delayChartEl || !cancelChartEl || !data) return;

		const airlines = Object.keys(AEROLINEAS);
		const datasets = airlines.map((code) => {
			const airlineData = data.dailyStats
				.filter((d) => d.airline === code)
				.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

			return {
				type: 'line' as const,
				label: AEROLINEAS[code as keyof typeof AEROLINEAS],
				data: airlineData.map((d) => ({
					x: new Date(d.date).getTime(),
					y: d.avgDelay
				})) as Point[],
				borderColor: AIRLINE_COLORS[code as keyof typeof AIRLINE_COLORS],
				backgroundColor: AIRLINE_COLORS[code as keyof typeof AIRLINE_COLORS],
				pointRadius: 3,
				borderWidth: 1.5,
				tension: 0.1
			};
		});

		const cancelDatasets = airlines.map((code) => {
			const airlineData = data.dailyStats
				.filter((d) => d.airline === code)
				.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

			return {
				type: 'line' as const,
				label: AEROLINEAS[code as keyof typeof AEROLINEAS],
				data: airlineData.map((d) => ({
					x: new Date(d.date).getTime(),
					y: d.cancelPercentage
				})) as Point[],
				borderColor: AIRLINE_COLORS[code as keyof typeof AIRLINE_COLORS],
				backgroundColor: AIRLINE_COLORS[code as keyof typeof AIRLINE_COLORS],
				pointRadius: 3,
				borderWidth: 1.5,
				tension: 0.1
			};
		});

		const config: ChartConfiguration<'line'> = {
			type: 'line',
			data: {
				datasets
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'nearest',
					axis: 'x',
					intersect: false
				},
				plugins: {
					title: {
						display: true,
						text: 'Promedio de retraso en despegue (minutos)',
						font: {
							size: 16,
							weight: 'bold'
						},
						padding: { top: 20, bottom: 10 }
					},
					legend: {
						position: isMobile ? 'bottom' : 'right',
						labels: {
							usePointStyle: true,
							boxWidth: 6,
							padding: isMobile ? 15 : 10
						}
					},
					tooltip: {
						callbacks: {
							label: (context: TooltipItem<'line'>) => {
								const label = context.dataset.label || '';
								const value = context.parsed.y;
								return `${label}: ${Math.round(value)}min`;
							}
						}
					}
				},
				scales: {
					x: {
						type: 'time',
						time: {
							unit: 'day'
						},
						min: startDate.toDate(tsz).getTime(),
						max: endDate.toDate(tsz).getTime(),
						ticks: {
							maxRotation: 0,
							autoSkip: true,
							font: {
								size: isMobile ? 10 : 12
							}
						}
					},
					y: {
						beginAtZero: true,
						max: 180,
						ticks: {
							callback: function (
								this: Scale<CoreScaleOptions>,
								tickValue: string | number,
								index: number,
								ticks: Tick[]
							) {
								return `${tickValue}min`;
							},
							font: {
								size: isMobile ? 10 : 12
							}
						}
					}
				},
				onClick: (event: ChartEvent, elements: any[]) => {
					if (elements.length > 0) {
						const element = elements[0];
						const dataset = datasets[element.datasetIndex];
						const dataPoint = dataset.data[element.index];
						const airline = Object.entries(AEROLINEAS).find(
							([, name]) => name === dataset.label
						)?.[0];
						if (airline) {
							goto(`/?date=${dayjs(dataPoint.x).format('YYYY-MM-DD')}&aerolinea=${airline}`);
						}
					}
				}
			}
		};

		const cancelConfig: ChartConfiguration<'line'> = {
			type: 'line',
			data: {
				datasets: cancelDatasets
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'nearest',
					axis: 'x',
					intersect: false
				},
				plugins: {
					title: {
						display: true,
						text: 'Porcentaje de vuelos cancelados',
						font: {
							size: 16,
							weight: 'bold'
						},
						padding: { top: 20, bottom: 10 }
					},
					legend: {
						position: isMobile ? 'bottom' : 'right',
						labels: {
							usePointStyle: true,
							boxWidth: 6,
							padding: isMobile ? 15 : 10
						}
					},
					tooltip: {
						callbacks: {
							label: (context: TooltipItem<'line'>) => {
								const label = context.dataset.label || '';
								const value = context.parsed.y;
								return `${label}: ${Math.round(value)}%`;
							}
						}
					}
				},
				scales: {
					x: {
						type: 'time',
						time: {
							unit: 'day'
						},
						min: startDate.toDate(tsz).getTime(),
						max: endDate.toDate(tsz).getTime(),
						ticks: {
							maxRotation: 0,
							autoSkip: true,
							font: {
								size: isMobile ? 10 : 12
							}
						}
					},
					y: {
						beginAtZero: true,
						max: 100,
						ticks: {
							callback: function (
								this: Scale<CoreScaleOptions>,
								tickValue: string | number,
								index: number,
								ticks: Tick[]
							) {
								return `${tickValue}%`;
							},
							font: {
								size: isMobile ? 10 : 12
							}
						}
					}
				},
				onClick: (event: ChartEvent, elements: any[]) => {
					if (elements.length > 0) {
						const element = elements[0];
						const dataset = cancelDatasets[element.datasetIndex];
						const dataPoint = dataset.data[element.index];
						const airline = Object.entries(AEROLINEAS).find(
							([, name]) => name === dataset.label
						)?.[0];
						if (airline) {
							goto(`/?date=${dayjs(dataPoint.x).format('YYYY-MM-DD')}&aerolinea=${airline}`);
						}
					}
				}
			}
		};

		if (delayChart) {
			delayChart.destroy();
		}
		if (cancelChart) {
			cancelChart.destroy();
		}

		delayChart = new Chart(delayChartEl, config);
		cancelChart = new Chart(cancelChartEl, cancelConfig);
	}

	$: if (delayChartEl && cancelChartEl && data) {
		updateCharts();
	}
</script>

<svelte:head>
	<title>Estadísticas históricas - failbondi.fail</title>
	<meta
		name="description"
		content="Estadísticas históricas de retrasos y cancelaciones de vuelos en Argentina"
	/>
</svelte:head>

<main class="mx-auto max-w-[1000px] p-2 sm:p-4">
	<h1 class="mb-4 text-3xl font-medium leading-none text-red-600 sm:text-4xl">
		Estadísticas históricas
	</h1>

	<div class="mb-6 flex flex-wrap items-center gap-4 sm:mb-8">
		<div class="flex w-full items-center gap-2 sm:w-auto">
			<Popover.Root>
				<Popover.Trigger>
					<Button variant="outline" class="w-full justify-start text-left font-normal sm:w-[280px]">
						<CalendarIcon class="mr-2 h-4 w-4" />
						{formatDate(startDate.toDate(tsz))} - {formatDate(endDate.toDate(tsz))}
					</Button>
				</Popover.Trigger>
				<Popover.Content class="w-auto p-0">
					<RangeCalendar.RangeCalendar
						value={dateRange}
						onValueChange={onDateSelect}
						numberOfMonths={isMobile ? 1 : 2}
						isDateUnavailable={(date) => {
							const dateStr = dayjs(date.toDate(tsz)).format('YYYY-MM-DD');
							return !data.availableDates.includes(dateStr);
						}}
					/>
				</Popover.Content>
			</Popover.Root>
		</div>
	</div>

	<div class="grid gap-6 sm:gap-8">
		<div class="w-full max-w-[1000px] rounded-lg border bg-white p-3 sm:p-4 dark:bg-neutral-900">
			<canvas bind:this={delayChartEl} height={isMobile ? 300 : 400}></canvas>
		</div>

		<div class="w-full max-w-[1000px] rounded-lg border bg-white p-3 sm:p-4 dark:bg-neutral-900">
			<canvas bind:this={cancelChartEl} height={isMobile ? 300 : 400}></canvas>
		</div>
	</div>
</main>

<div class="prose prose-neutral dark:prose-invert mx-auto mt-8 max-w-[600px] p-4 sm:mt-12">
	<h2>Metodología</h2>

	<p>Los datos mostrados en esta página son procesados de la siguiente manera:</p>

	<ul>
		<li>
			Solo se muestran datos de vuelos que salen (no de arribos) desde o hacia aeropuertos operados
			por Flybondi.
		</li>
		<li>
			Se excluyen las aerolíneas que tienen menos de 10 vuelos por día para evitar datos
			estadísticamente poco significativos.
		</li>
		<li>
			El retraso promedio se calcula como la diferencia en minutos entre la hora programada y la
			hora real de despegue.
		</li>
		<li>
			El porcentaje de cancelaciones es la proporción de vuelos marcados como "Cancelado" sobre el
			total de vuelos del día.
		</li>
		<li>
			Los días sin datos o con menos de 10 vuelos por aerolínea no son seleccionables en el
			calendario.
		</li>
	</ul>

	<p>Los datos son actualizados cada minuto y provienen de la API de Aeropuertos Argentina 2000.</p>
</div>

<Footer>
	<a href="/">Ver datos de hoy</a>
</Footer>
