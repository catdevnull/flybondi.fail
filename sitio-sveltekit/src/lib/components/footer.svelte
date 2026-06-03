<script lang="ts">
	import { page } from '$app/stores';

	$: currentPath = $page.url.pathname;
	$: todayFlightsPath = `/date/${argentinaDateKey(new Date())}`;

	function isActive(path: string): boolean {
		return currentPath === path;
	}

	function getLinkClass(path: string): string {
		const baseClass = 'transition-colors';
		if (isActive(path)) {
			return `${baseClass} text-neutral-900 dark:text-neutral-100 font-medium`;
		}
		return `${baseClass} hover:text-neutral-900 dark:hover:text-neutral-100`;
	}

	function argentinaDateKey(date: Date): string {
		const parts = new Intl.DateTimeFormat('en', {
			timeZone: 'America/Argentina/Buenos_Aires',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).formatToParts(date);
		const year = parts.find((part) => part.type === 'year')?.value;
		const month = parts.find((part) => part.type === 'month')?.value;
		const day = parts.find((part) => part.type === 'day')?.value;
		return `${year}-${month}-${day}`;
	}
</script>

<footer
	class="mt-8 border-t border-neutral-200 px-4 py-6 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
>
	<div class="mx-auto max-w-[1000px]">
		<p class="max-w-3xl text-xs leading-5">
			La marca Flybondi es de FB Líneas Aéreas S.A. Este sitio web no está afiliado, respaldado ni
			patrocinado por FB Líneas Aéreas S.A. Todos los derechos asociados a la marca y su uso están
			reservados a su propietario legítimo. El uso de la marca en este sitio es únicamente
			informativo. No nos hacemos responsables de los errores que puedan haber en la información
			presentada.
		</p>
		<div class="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
			<nav class="flex flex-col gap-2" aria-label="Datos">
				<h2 class="font-medium text-neutral-900 dark:text-neutral-100">Datos</h2>
				<a href={todayFlightsPath} class={getLinkClass(todayFlightsPath)}>Ver vuelos de hoy</a>
				<a href="/" class={getLinkClass('/')}>Estado de Flybondi</a>
				<a href="/historico" class={getLinkClass('/historico')}>Histórico diario</a>
				<a href="/historico-meses" class={getLinkClass('/historico-meses')}>Histórico mensual</a>
				<a href="/aeropuertos" class={getLinkClass('/aeropuertos')}>Por aeropuerto</a>
				<a href="/rutas" class={getLinkClass('/rutas')}>Por ruta</a>
				<a href="/leaderboard" class={getLinkClass('/leaderboard')}>Ranking de aerolíneas</a>
			</nav>

			<nav class="flex flex-col gap-2" aria-label="Información">
				<h2 class="font-medium text-neutral-900 dark:text-neutral-100">Información</h2>
				<a href="/acerca" class={getLinkClass('/acerca')}>Acerca del sitio y sus datos</a>
				<a
					href="https://github.com/catdevnull/flybondi.fail"
					class="hover:text-neutral-900 dark:hover:text-neutral-100"
				>
					Código fuente
				</a>
			</nav>

			<div class="flex flex-col gap-2">
				<h2 class="font-medium text-neutral-900 dark:text-neutral-100">Contacto</h2>
				<a
					href="https://x.com/esoesnulo"
					class="hover:text-neutral-900 dark:hover:text-neutral-100"
				>
					@esoesnulo
				</a>
				<a href="mailto:hola@nulo.lol" class="hover:text-neutral-900 dark:hover:text-neutral-100">
					hola@nulo.lol
				</a>

				<p class="text-xs leading-5">
					Failbondi.fail es un experimento de
					<a href="https://nulo.lol" class="hover:text-neutral-900 dark:hover:text-neutral-100">
						Nulo Science Inc™
					</a>.
				</p>
			</div>
		</div>
	</div>
</footer>
