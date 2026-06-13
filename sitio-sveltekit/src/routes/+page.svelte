<script lang="ts">
	import Footer from '@/components/footer.svelte';
	import cardPath from '$lib/assets/twitter-card.png';
	import AverageVis from './average-vis.svelte';
	import FlightSummaryChart from '$lib/components/flight-summary-chart.svelte';

	export let data;

	type Week = (typeof data.weeks)[number];

	const chartWidth = 960;
	const chartHeight = 360;
	const padding = { top: 20, right: 52, bottom: 42, left: 24 };
	const plotWidth = chartWidth - padding.left - padding.right;
	const plotHeight = chartHeight - padding.top - padding.bottom;
	const minXAxisLabelGap = 78;
	const tooltipWidth = 190;
	const tooltipHeight = 86;

	const numberFormatter = Intl.NumberFormat('es-AR');
	const decimalFormatter = Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
	const dateFormatter = Intl.DateTimeFormat('es-AR', {
		day: '2-digit',
		month: 'short',
		timeZone: 'America/Argentina/Buenos_Aires'
	});
	const longDateFormatter = Intl.DateTimeFormat('es-AR', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
		timeZone: 'America/Argentina/Buenos_Aires'
	});
	const weekdayDateFormatter = Intl.DateTimeFormat('es-AR', {
		weekday: 'short',
		day: '2-digit',
		month: '2-digit',
		timeZone: 'America/Argentina/Buenos_Aires'
	});

	let hoveredWeekIndex: number | null = null;

	$: weeks = data.weeks;
	$: todayFlybondiFlights = data.todayFlights;
	$: todayCancelledFlybondiFlights = todayFlybondiFlights.filter(
		(flight) => flight.json.estes === 'Cancelado'
	);
	$: todayDelayedFlybondiFlights = todayFlybondiFlights.filter((flight) => flight.delta >= 60 * 30);
	$: todayAirlineData = data.todayAirlineData;
	$: firstWeek = weeks[0];
	$: lastWeek = weeks[weeks.length - 1];
	$: hoveredWeek = hoveredWeekIndex === null ? null : weeks[hoveredWeekIndex];
	$: maxFlights = Math.max(1, ...weeks.map((week: Week) => week.totalFlights));
	$: maxCancelled = Math.max(1, ...weeks.map((week: Week) => week.cancelledFlights));
	$: maxAircraft = Math.max(1, ...weeks.map((week: Week) => week.avgAircraftPerDay));
	$: latestCancellationRate = lastWeek
		? (lastWeek.cancelledFlights / Math.max(1, lastWeek.totalFlights)) * 100
		: 0;
	$: aircraftDrop =
		firstWeek && lastWeek ? firstWeek.avgAircraftPerDay - lastWeek.avgAircraftPerDay : 0;
	$: flightDrop = firstWeek && lastWeek ? firstWeek.totalFlights - lastWeek.totalFlights : 0;
	$: xStep = weeks.length > 1 ? plotWidth / (weeks.length - 1) : 0;
	$: flightPoints = weeks
		.map((week: Week, index: number) => {
			const x = padding.left + index * xStep;
			const y = padding.top + plotHeight - (week.totalFlights / maxFlights) * plotHeight;
			return `${x},${y}`;
		})
		.join(' ');
	$: aircraftPoints = weeks
		.map((week: Week, index: number) => {
			const x = padding.left + index * xStep;
			const y = padding.top + plotHeight - (week.avgAircraftPerDay / maxAircraft) * plotHeight;
			return `${x},${y}`;
		})
		.join(' ');
	$: xLabelEvery = Math.max(1, Math.ceil(minXAxisLabelGap / Math.max(1, xStep)));
	$: lastScheduledLabelIndex =
		weeks.length > 1 ? Math.floor((weeks.length - 1) / xLabelEvery) * xLabelEvery : 0;

	function xFor(index: number) {
		return padding.left + index * xStep;
	}

	function flightY(value: number) {
		return padding.top + plotHeight - (value / maxFlights) * plotHeight;
	}

	function aircraftY(value: number) {
		return padding.top + plotHeight - (value / maxAircraft) * plotHeight;
	}

	function cancelledY(value: number) {
		return padding.top + plotHeight - (value / maxCancelled) * plotHeight;
	}

	function cancelledBarWidth() {
		return Math.min(10, Math.max(3, xStep * 0.32));
	}

	function percent(value: number) {
		return `${decimalFormatter.format(value)}%`;
	}

	function dateLabel(date: string) {
		return weekdayDateFormatter
			.format(new Date(`${date}T00:00:00-03:00`))
			.replace('.', '')
			.replace(',', '');
	}

	function weekLabel(week: Week) {
		return longDateFormatter.format(new Date(`${week.weekStart}T00:00:00-03:00`));
	}

	function shouldShowXLabel(index: number) {
		if (index % xLabelEvery === 0) return true;
		const isLast = index === weeks.length - 1;
		return isLast && xFor(index) - xFor(lastScheduledLabelIndex) >= minXAxisLabelGap;
	}

	function tooltipX(index: number) {
		return Math.min(
			chartWidth - padding.right - tooltipWidth,
			Math.max(padding.left, xFor(index) - tooltipWidth / 2)
		);
	}

	function tooltipY(week: Week) {
		return Math.max(padding.top, flightY(week.totalFlights) - tooltipHeight - 12);
	}
</script>

<svelte:head>
	<title>Flybondi se achica - failbondi.fail</title>
	<meta
		name="description"
		content="Vuelos, cancelaciones y aviones activos usados por Flybondi semana a semana desde el inicio de los datos."
	/>
	<link rel="canonical" href="https://failbondi.fail" />

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Flybondi se achica - failbondi.fail" />
	<meta
		property="og:description"
		content="Vuelos, cancelaciones y aviones activos usados por Flybondi semana a semana desde el inicio de los datos."
	/>
	<meta property="og:url" content="https://failbondi.fail" />
	<meta property="og:image" content={'https://failbondi.fail' + cardPath} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@esoesnulo" />
	<meta name="twitter:title" content="Flybondi se achica - failbondi.fail" />
	<meta
		name="twitter:description"
		content="Vuelos, cancelaciones y aviones activos usados por Flybondi semana a semana desde el inicio de los datos."
	/>
	<meta name="twitter:url" content="https://failbondi.fail" />
	<meta name="twitter:image" content={'https://failbondi.fail' + cardPath} />
</svelte:head>

<main class="mx-auto max-w-[1120px] px-4 py-6 sm:px-6">
	<header class="mb-5 flex flex-col gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
		<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
			<div>
				<a href={data.todayFlightsUrl} class="text-3xl font-medium leading-none text-red-600">
					failbondi.fail
				</a>
				<h1
					class="mt-3 max-w-3xl text-2xl font-extrabold text-neutral-950 sm:text-3xl dark:text-neutral-50"
				>
					Flybondi está faileando
				</h1>
			</div>
		</div>
		<p
			class="max-w-none text-base leading-7 text-neutral-700 sm:text-lg sm:leading-8 dark:text-neutral-300"
		>
			Hace 5 meses arrancaron el verano cancelando más de 150 vuelos y complicando a unos 25.000
			pasajeros.<sup
				><a
					class="text-red-600 hover:underline dark:text-red-400"
					href="https://www.latrochadigital.com.ar/2026/01/13/flybondi-cancelo-mas-de-150-vuelos-y-afecto-a-unos-25-mil-pasajeros/"
					>1</a
				></sup
			>
			Hace 3 meses tuvieron ocho aviones parados por problemas contractuales con proveedores ACMI.<sup
				><a
					class="text-red-600 hover:underline dark:text-red-400"
					href="https://www.lanacion.com.ar/economia/flybondi-cancelo-vuelos-por-problemas-con-los-aviones-que-tiene-en-alquiler-nid13032026/"
					>2</a
				></sup
			>
			Hace 4 meses Mauricio Sana fue corrido del día a día y Paz Lovisolo quedó como CEO, mientras Leonardo
			Scatturice y COC Global Enterprise tomaban el volante del grupo.<sup
				><a
					class="text-red-600 hover:underline dark:text-red-400"
					href="https://www.aviacionnews.com/2026/02/cambios-en-la-cupula-de-flybondi/">3</a
				></sup
			>
			Ahora Lovisolo también habría dejado el cargo después de apenas cuatro meses, y LA NACION reportó
			que Flybondi ya no tendría CEO sino una operación en cabeza de Leonel Dopazo.<sup
				><a
					class="text-red-600 hover:underline dark:text-red-400"
					href="https://www.lanacion.com.ar/economia/flybondi-llego-a-operar-con-un-solo-avion-y-acumula-mas-de-2500-vuelos-cancelados-en-el-ultimo-ano-nid02062026/"
					>4</a
				></sup
			>
			Hoy la foto es todavía más ridícula: medios reportan a Flybondi intentando sostener una aerolínea
			con uno o dos aviones operativos, vendiendo y programando vuelos que después no tiene flota suficiente
			para cumplir.<sup
				><a
					class="text-red-600 hover:underline dark:text-red-400"
					href="https://www.cronista.com/negocios/flybondi-en-crisis-solo-funcionan-dos-aviones-acumula-mas-de-2500-vuelos-cancelados-y-habria-renunciado-su-ceo/"
					>5</a
				></sup
			>
		</p>
	</header>

	<section class="pb-5">
		<div class="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
			<div>
				<h2 class="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
					Semana por semana
				</h2>
			</div>
			<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm">
				<span class="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
					<span class="h-0.5 w-6 bg-neutral-950 dark:bg-neutral-100"></span>
					vuelos
				</span>
				<span class="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
					<span class="h-0.5 w-6 bg-red-600"></span>
					cancelados
				</span>
				<span class="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
					<span class="h-0.5 w-6 bg-amber-500"></span>
					aviones activos por día
				</span>
			</div>
		</div>

		<div class="overflow-x-auto">
			<svg
				viewBox={`0 0 ${chartWidth} ${chartHeight}`}
				class="min-w-[760px] text-neutral-500 dark:text-neutral-400"
				role="img"
				aria-label="Vuelos, vuelos cancelados y aviones activos usados por Flybondi desde el inicio de los datos"
			>
				{#each [0, 0.25, 0.5, 0.75, 1] as tick}
					<line
						x1={padding.left}
						x2={chartWidth - padding.right}
						y1={padding.top + plotHeight - tick * plotHeight}
						y2={padding.top + plotHeight - tick * plotHeight}
						stroke="currentColor"
						stroke-opacity="0.18"
					/>
				{/each}

				{#each weeks as week, index}
					<rect
						x={xFor(index) - cancelledBarWidth() / 2}
						y={cancelledY(week.cancelledFlights)}
						width={cancelledBarWidth()}
						height={padding.top + plotHeight - cancelledY(week.cancelledFlights)}
						fill="#dc2626"
					/>
				{/each}

				<polyline points={flightPoints} fill="none" stroke="currentColor" stroke-width="2.5" />
				<polyline points={aircraftPoints} fill="none" stroke="#f59e0b" stroke-width="2.5" />

				{#each weeks as week, index}
					{#if shouldShowXLabel(index)}
						<text
							x={xFor(index)}
							y={chartHeight - 14}
							text-anchor="middle"
							class="fill-current text-[11px]"
						>
							{dateFormatter.format(new Date(`${week.weekStart}T00:00:00-03:00`))}
						</text>
					{/if}
				{/each}

				{#each weeks as week, index}
					<a
						href={`/date/${week.weekStart}`}
						on:mouseenter={() => (hoveredWeekIndex = index)}
						on:focus={() => (hoveredWeekIndex = index)}
						on:mouseleave={() => (hoveredWeekIndex = null)}
						on:blur={() => (hoveredWeekIndex = null)}
						aria-label={`Semana del ${weekLabel(week)}: ${week.totalFlights} vuelos, ${week.cancelledFlights} cancelados, ${decimalFormatter.format(week.avgAircraftPerDay)} aviones activos por día`}
					>
						<rect
							x={xFor(index) - Math.max(8, xStep / 2)}
							y={padding.top}
							width={Math.max(16, xStep)}
							height={plotHeight}
							fill="transparent"
							class="cursor-pointer"
						/>
					</a>
				{/each}

				{#if hoveredWeek && hoveredWeekIndex !== null}
					<line
						x1={xFor(hoveredWeekIndex)}
						x2={xFor(hoveredWeekIndex)}
						y1={padding.top}
						y2={padding.top + plotHeight}
						stroke="currentColor"
						stroke-opacity="0.35"
						stroke-dasharray="3 3"
					/>
					<circle
						cx={xFor(hoveredWeekIndex)}
						cy={flightY(hoveredWeek.totalFlights)}
						r="4"
						fill="currentColor"
					/>
					<circle
						cx={xFor(hoveredWeekIndex)}
						cy={aircraftY(hoveredWeek.avgAircraftPerDay)}
						r="4"
						fill="#f59e0b"
					/>
					<g transform={`translate(${tooltipX(hoveredWeekIndex)}, ${tooltipY(hoveredWeek)})`}>
						<rect
							width={tooltipWidth}
							height={tooltipHeight}
							rx="6"
							fill="white"
							stroke="currentColor"
							stroke-opacity="0.25"
							class="dark:fill-neutral-950"
						/>
						<text
							x="10"
							y="18"
							class="fill-neutral-950 text-[12px] font-semibold dark:fill-neutral-50"
						>
							{weekLabel(hoveredWeek)}
						</text>
						<text x="10" y="38" class="fill-neutral-700 text-[12px] dark:fill-neutral-300">
							Vuelos: {numberFormatter.format(hoveredWeek.totalFlights)}
						</text>
						<text x="10" y="55" class="fill-neutral-700 text-[12px] dark:fill-neutral-300">
							Cancelados: {numberFormatter.format(hoveredWeek.cancelledFlights)}
							({percent(
								(hoveredWeek.cancelledFlights / Math.max(1, hoveredWeek.totalFlights)) * 100
							)})
						</text>
						<text x="10" y="72" class="fill-neutral-700 text-[12px] dark:fill-neutral-300">
							Aviones activos: {decimalFormatter.format(hoveredWeek.avgAircraftPerDay)}
						</text>
					</g>
				{/if}

				{#if lastWeek}
					<text
						x={chartWidth - padding.right + 8}
						y={flightY(lastWeek.totalFlights) + 4}
						class="fill-current text-[12px] font-semibold"
					>
						{numberFormatter.format(lastWeek.totalFlights)}
					</text>
					<text
						x={chartWidth - padding.right + 8}
						y={aircraftY(lastWeek.avgAircraftPerDay) + 4}
						fill="#f59e0b"
						class="text-[12px] font-semibold"
					>
						{decimalFormatter.format(lastWeek.avgAircraftPerDay)}
					</text>
				{/if}
			</svg>
		</div>
		<div>
			<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
				{data.period.start} a {data.period.end}, solo semanas completas. Contamos aviones activos
				por la cantidad de matriculas únicas.
			</p>
			{#if firstWeek && lastWeek}
				<p class="mt-3 text-sm leading-6 text-neutral-800 dark:text-neutral-200">
					En la primera semana completa del registro, Flybondi usaba
					<strong>{decimalFormatter.format(firstWeek.avgAircraftPerDay)}</strong> aviones activos
					por día en promedio y tenía
					<strong>{numberFormatter.format(firstWeek.totalFlights)}</strong>
					vuelos semanales. En la última semana completa usó
					<strong>{decimalFormatter.format(lastWeek.avgAircraftPerDay)}</strong> aviones activos por
					día y tuvo <strong>{numberFormatter.format(lastWeek.totalFlights)}</strong> vuelos.
				</p>
			{/if}
		</div>

		<div class="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-800">
			<div class="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
				<div>
					<h2 class="text-xl font-semibold text-neutral-950 dark:text-neutral-50">Vuelos de hoy</h2>
					<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
						{longDateFormatter.format(new Date(`${data.todayDate}T00:00:00-03:00`))}
					</p>
				</div>
				<a
					href={data.todayFlightsUrl}
					class="inline-flex h-9 items-center justify-center rounded-md border border-red-700 bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-500 dark:focus:ring-offset-neutral-900"
				>
					Ver detalle completo
				</a>
			</div>

			{#if todayFlybondiFlights.length > 0}
				<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
					<FlightSummaryChart
						flights={todayFlybondiFlights}
						delayedFlights={todayDelayedFlybondiFlights}
						cancelledFlights={todayCancelledFlybondiFlights}
					/>

					<div
						class="rounded-lg border bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800"
					>
						<h3 class="mb-2 text-base font-semibold text-neutral-950 dark:text-neutral-50">
							Promedio de retraso en el despegue
						</h3>
						{#if todayAirlineData.length > 0}
							<AverageVis airlineData={todayAirlineData} height={150} />
						{:else}
							<p class="text-sm text-neutral-600 dark:text-neutral-400">
								Todavía no hay vuelos aterrizados para calcular el promedio.
							</p>
						{/if}
					</div>
				</div>
			{:else}
				<p
					class="rounded-lg border bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
				>
					Todavía no hay datos de Flybondi para hoy.
				</p>
			{/if}

			<nav class="mt-3 flex flex-wrap gap-1.5" aria-label="Fechas disponibles">
				{#each data.recentAvailableDates as availableDate}
					<a
						href="/date/{availableDate}"
						class="inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium {availableDate ===
						data.todayDate
							? 'border-red-700 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/40 dark:text-red-300'
							: 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'}"
						aria-current={availableDate === data.todayDate ? 'date' : undefined}
					>
						{availableDate === data.todayDate ? 'Hoy' : dateLabel(availableDate)}
					</a>
				{/each}
			</nav>
		</div>
	</section>
</main>

<Footer />
