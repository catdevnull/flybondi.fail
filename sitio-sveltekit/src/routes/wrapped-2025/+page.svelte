<script lang="ts">
	import AIRPORTS_ALIAS from '$lib/aerolineas-airports-subset-alias.json';
	import Footer from '@/components/footer.svelte';

	export let data;

	const OTHER_AIRPORTS: Record<string, string> = {
		CNQ: 'Corrientes',
		GIG: 'Rio de Janeiro',
		GRU: 'Sao Paulo',
		USH: 'Ushuaia',
		FLN: 'Florianopolis',
		FTE: 'El Calafate',
		NQN: 'Neuquen',
		ASU: 'Asunción'
	};

	function getAirport(iata: string) {
		const airport = AIRPORTS_ALIAS[iata as keyof typeof AIRPORTS_ALIAS];
		if (airport) return airport;
		if (OTHER_AIRPORTS[iata]) return OTHER_AIRPORTS[iata];
		return iata;
	}

	function getRouteDisplay(route: string) {
		const [origin, destination] = route.split(' → ');
		return `${getAirport(origin)} → ${getAirport(destination)}`;
	}

	function formatMinutes(minutes: number) {
		if (minutes < 60) return `${Math.round(minutes)} min`;
		const hours = Math.floor(minutes / 60);
		const mins = Math.round(minutes % 60);
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	}

	function formatTotalTime(minutes: number) {
		const days = Math.floor(minutes / (60 * 24));
		const hours = Math.floor((minutes % (60 * 24)) / 60);
		if (days > 0) return { value: days.toLocaleString('es-AR'), unit: 'días' };
		return { value: hours.toString(), unit: 'horas' };
	}

	function getMonthName(monthStr: string) {
		const months: Record<string, string> = {
			'01': 'Enero',
			'02': 'Febrero',
			'03': 'Marzo',
			'04': 'Abril',
			'05': 'Mayo',
			'06': 'Junio',
			'07': 'Julio',
			'08': 'Agosto',
			'09': 'Septiembre',
			'10': 'Octubre',
			'11': 'Noviembre',
			'12': 'Diciembre'
		};
		const month = monthStr.split('-')[1];
		return months[month] || monthStr;
	}

	$: stats = data.stats ?? {
		total_flights: 0,
		cancelled_flights: 0,
		completed_flights: 0,
		avg_delay_minutes: 0,
		delayed_15_flights: 0,
		delayed_30_flights: 0,
		delayed_60_flights: 0,
		delayed_120_flights: 0,
		max_delay_minutes: 0,
		total_delay_minutes: 0
	};

	$: totalTime = formatTotalTime(stats.total_delay_minutes || 0);
	$: metaTitle = 'Failbondi Wrapped 2025 - El año de Flybondi en números';
	$: metaDescription = `En 2025, Flybondi canceló ${stats.cancelled_flights?.toLocaleString('es-AR') || 0} vuelos y acumuló ${totalTime.value} ${totalTime.unit} de demoras.`;
</script>

<svelte:head>
	{@html `<style>
		@media (max-width: 639px) {
			html {
				scroll-snap-type: y mandatory;
			}
		}
	</style>`}
	<title>{metaTitle}</title>
	<meta name="description" content={metaDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={metaTitle} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content="https://failbondi.fail/wrapped-2025" />
	<meta property="og:image" content="https://failbondi.fail/wrapped-2025/og.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@esoesnulo" />
	<meta name="twitter:title" content={metaTitle} />
	<meta name="twitter:description" content={metaDescription} />
	<meta name="twitter:url" content="https://failbondi.fail/wrapped-2025" />
	<meta name="twitter:image" content="https://failbondi.fail/wrapped-2025/og.png" />
</svelte:head>

<!-- Main container with Flybondi yellow background -->
<div class="min-h-screen bg-[#FDBE11] px-4 py-8 sm:px-8 sm:py-12">
	<!-- Header -->
	<header class="mx-auto mb-8 flex max-w-6xl items-center justify-between">
		<a href="/" class="text-xl font-bold text-black hover:underline">← failbondi.fail</a>
		<span class="font-medium text-black/60">2025</span>
	</header>

	<!-- Cards Grid -->
	<div class="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Card 1: Hero/Title Card -->
		<div class="relative aspect-[3/4] shrink-0 snap-center overflow-hidden rounded-3xl bg-black">
			<!-- Geometric pattern background -->
			<div class="absolute inset-0 opacity-100">
				<svg class="h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">
					<defs>
						<pattern id="circles1" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
							<circle cx="30" cy="30" r="25" fill="none" stroke="white" stroke-width="3" />
							<circle cx="30" cy="30" r="18" fill="none" stroke="white" stroke-width="3" />
							<circle cx="30" cy="30" r="11" fill="none" stroke="white" stroke-width="3" />
							<circle cx="30" cy="30" r="4" fill="white" />
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#circles1)" />
				</svg>
			</div>
			<!-- Year text -->
			<div class="absolute inset-0 flex items-center justify-center">
				<span
					class="text-[10rem] font-black leading-none text-[#ff4444] sm:text-[8rem]"
					style="font-family: system-ui; text-shadow: 4px 4px 0 #000;"
				>
					25
				</span>
			</div>
			<!-- Title overlay -->
			<div
				class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-20"
			>
				<h1 class="text-2xl font-black text-white">Failbondi</h1>
				<p class="text-4xl font-black text-[#FDBE11]">Wrapped</p>
			</div>
		</div>

		<!-- Card 2: Total Delay Time -->
		<div
			class="relative flex aspect-[3/4] shrink-0 snap-center flex-col overflow-hidden rounded-3xl bg-[#1a1a1a]"
		>
			<!-- Decorative lines -->
			<svg class="absolute left-0 top-0 h-32 w-full opacity-30" viewBox="0 0 400 150">
				<path d="M0,75 Q100,20 200,75 T400,75" stroke="white" stroke-width="1.5" fill="none" />
				<path d="M0,85 Q100,30 200,85 T400,85" stroke="white" stroke-width="1" fill="none" />
				<path d="M0,95 Q100,40 200,95 T400,95" stroke="white" stroke-width="0.5" fill="none" />
			</svg>

			<div class="flex flex-1 flex-col items-center justify-center p-6 text-center">
				<p class="text-6xl font-black text-[#a78bfa] sm:text-7xl">
					{totalTime.value}
				</p>
				<p class="mt-2 text-xl text-white">{totalTime.unit} de demoras</p>
				<p class="mt-4 max-w-[200px] text-sm text-neutral-400">
					Tiempo acumulado en demoras de todos los vuelos de Flybondi en 2025.
				</p>
			</div>

			<div class="p-6 pt-0">
				<a
					href="/"
					class="block w-full rounded-full bg-white px-6 py-3 text-center text-sm font-bold text-black transition-colors hover:bg-neutral-200"
				>
					Ver datos de hoy
				</a>
			</div>
		</div>

		<!-- Card 3: Top Airports (Light card) -->
		<div
			class="relative flex aspect-[3/4] shrink-0 snap-center flex-col overflow-hidden rounded-3xl bg-[#f5f5f0]"
		>
			<!-- Decorative dots -->
			<div class="absolute bottom-4 right-4">
				<svg width="80" height="80" viewBox="0 0 80 80">
					<circle cx="50" cy="20" r="12" fill="#ff4444" />
					<circle cx="60" cy="55" r="10" fill="#ff4444" />
				</svg>
			</div>

			<div class="flex-1 p-6">
				<h2 class="mb-6 text-xl font-black text-black">Aeropuertos con más demoras</h2>

				<div class="">
					{#each data.worstAirports.slice(0, 5) as airport, i}
						<div class="flex items-baseline gap-2">
							<span class="text-sm font-bold text-neutral-400">{i + 1}</span>
							<span class="font-black text-black" class:text-3xl={i === 0} class:text-lg={i >= 1}>
								{getAirport(airport.airport)}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="p-6 pt-0">
				<div class="rounded-full bg-black px-3 py-3 text-center text-sm font-bold text-white">
					Promedio: {formatMinutes(data.worstAirports[0]?.avg_delay_minutes || 0)} de demora
				</div>
			</div>
		</div>

		<!-- Card 4: Cancellations -->
		<div
			class="relative flex aspect-[3/4] shrink-0 snap-center flex-col overflow-hidden rounded-3xl bg-[#1a1a1a]"
		>
			<!-- Geometric pattern -->
			<div class="relative h-48 overflow-hidden">
				<svg
					class="absolute inset-0 h-full w-full"
					viewBox="0 0 400 200"
					preserveAspectRatio="xMidYMid slice"
				>
					<defs>
						<pattern id="stripes1" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
							<rect width="10" height="20" fill="white" />
							<rect x="10" width="10" height="20" fill="black" />
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#stripes1)" />
				</svg>
				<div class="absolute inset-0 flex items-center justify-center">
					<span class="text-8xl font-black text-[#FDBE11]" style="text-shadow: 3px 3px 0 #000;">
						{stats.cancelled_flights?.toLocaleString('es-AR') || 0}
					</span>
				</div>
			</div>

			<div class="flex flex-1 flex-col justify-center p-6">
				<h2 class="text-2xl font-black text-white">Vuelos cancelados</h2>
				<p class="mt-2 text-neutral-400">
					De un total de <span class="font-bold text-white"
						>{stats.total_flights?.toLocaleString('es-AR') || 0}</span
					> vuelos operados.
				</p>
			</div>

			<div class="p-6 pt-0">
				<div class="rounded-full bg-white px-6 py-3 text-center text-sm font-bold text-black">
					{stats.total_flights > 0
						? ((stats.cancelled_flights / stats.total_flights) * 100).toFixed(1)
						: 0}% de cancelación
				</div>
			</div>
		</div>

		<!-- Card 5: Worst Routes -->
		<div
			class="relative flex aspect-[3/4] shrink-0 snap-center flex-col overflow-hidden rounded-3xl bg-[#f5f5f0]"
		>
			<div class="flex-1 p-6">
				<h2 class="mb-4 text-xl font-black text-black">Rutas más demoradas</h2>

				<div class="space-y-2">
					{#each data.worstRoutes.slice(0, 5) as route, i}
						<div class="flex items-start gap-2">
							<span class="text-sm font-bold text-neutral-400">{i + 1}</span>
							<div>
								<span class="block text-sm font-bold text-black">
									{getRouteDisplay(route.route)}
								</span>
								<span class="text-xs text-neutral-500">
									{formatMinutes(route.avg_delay_minutes || 0)} promedio
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Decorative element -->
			<div class="absolute bottom-20 right-0">
				<svg width="100" height="100" viewBox="0 0 100 100">
					<ellipse cx="80" cy="50" rx="60" ry="40" fill="none" stroke="#1a1a1a" stroke-width="2" />
					<ellipse cx="80" cy="50" rx="45" ry="30" fill="none" stroke="#1a1a1a" stroke-width="2" />
					<ellipse cx="80" cy="50" rx="30" ry="20" fill="none" stroke="#1a1a1a" stroke-width="2" />
				</svg>
			</div>

			<div class="relative z-10 p-6 pt-0">
				<a
					href="/aeropuertos"
					class="block w-full rounded-full bg-black px-6 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-neutral-800"
				>
					Ver todos los aeropuertos
				</a>
			</div>
		</div>

		<!-- Card 6: Delay Stats -->
		<div
			class="relative flex aspect-[3/4] shrink-0 snap-center flex-col overflow-hidden rounded-3xl bg-[#1a1a1a]"
		>
			<div class="flex flex-1 flex-col items-center justify-center p-6 text-center">
				<p class="text-xs uppercase tracking-wider text-neutral-500">Demora promedio</p>
				<p class="text-6xl font-black text-[#fbbf24]">
					{formatMinutes(stats.avg_delay_minutes || 0)}
				</p>
				<p class="mt-4 max-w-[200px] text-sm text-neutral-400">
					Tiempo promedio de demora en el despegue de todos los vuelos de Flybondi en 2025.
				</p>
			</div>

			<div class="p-6 pt-0">
				<a
					href="/historico"
					class="block w-full rounded-full bg-white px-6 py-3 text-center text-sm font-bold text-black transition-colors hover:bg-neutral-200"
				>
					Ver histórico
				</a>
			</div>
		</div>

		<!-- Card 7: Worst Month -->
		{#if data.worstMonth}
			<div
				class="relative flex aspect-[3/4] shrink-0 snap-center flex-col overflow-hidden rounded-3xl bg-[#ff4444]"
			>
				<div class="flex flex-1 flex-col items-center justify-center p-6 text-center">
					<p class="mb-2 text-sm uppercase tracking-wider text-white/60">El peor mes</p>
					<p class="text-5xl font-black text-white">
						{getMonthName(data.worstMonth.month)}
					</p>
					<p class="mt-4 text-lg text-white/80">
						{formatMinutes(data.worstMonth.avg_delay_minutes || 0)} de demora promedio
					</p>
				</div>

				<!-- Pattern overlay -->
				<div class="absolute bottom-0 left-0 right-0 h-24 opacity-20">
					<svg class="h-full w-full" viewBox="0 0 400 100" preserveAspectRatio="none">
						<defs>
							<pattern id="dots1" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
								<circle cx="10" cy="10" r="4" fill="white" />
							</pattern>
						</defs>
						<rect width="100%" height="100%" fill="url(#dots1)" />
					</svg>
				</div>
			</div>
		{/if}

		<!-- Card 8: Summary -->
		<div
			class="relative flex aspect-[3/4] shrink-0 snap-center flex-col overflow-hidden rounded-3xl bg-black sm:col-span-2 lg:col-span-1"
		>
			<div class="flex flex-1 flex-col justify-between p-6">
				<div>
					<p class="mb-1 text-xs uppercase tracking-wider text-neutral-500">Vuelos totales</p>
					<p class="text-5xl font-black text-white">
						{stats.total_flights?.toLocaleString('es-AR') || 0}
					</p>
				</div>

				<div class="my-6 space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-neutral-400">Cancelados</span>
						<span class="font-bold text-[#ff4444]"
							>{stats.cancelled_flights?.toLocaleString('es-AR') || 0}</span
						>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-neutral-400">Demorados +30m</span>
						<span class="font-bold text-[#fbbf24]"
							>{stats.delayed_30_flights?.toLocaleString('es-AR') || 0}</span
						>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-neutral-400">Demorados +1h</span>
						<span class="font-bold text-[#f97316]"
							>{stats.delayed_60_flights?.toLocaleString('es-AR') || 0}</span
						>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-neutral-400">Demorados +2h</span>
						<span class="font-bold text-[#ef4444]"
							>{stats.delayed_120_flights?.toLocaleString('es-AR') || 0}</span
						>
					</div>
				</div>

				<div class="border-t border-neutral-800 pt-4">
					<p class="text-lg font-black text-[#FDBE11]">#FailbondiWrapped2025</p>
					<p class="mt-1 text-xs text-neutral-500">FAILBONDI.FAIL/WRAPPED-2025</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<footer class="mx-auto mt-12 max-w-6xl snap-center text-center">
		<p class="text-sm text-black/60">
			Datos de Aeropuertos Argentina. Análisis de datos por Failbondi. Puede fallar - pero Flybondi
			no quiere dar sus propios datos.
		</p>
	</footer>
</div>

<div class="snap-center">
	<Footer />
</div>
