<script lang="ts">
	import { page } from '$app/stores';

	$: currentPath = $page.url.pathname;

	function isActive(path: string): boolean {
		return currentPath === path;
	}

	function getLinkClass(path: string): string {
		const baseClass = 'transition-colors duration-200';
		if (isActive(path)) {
			return `${baseClass} text-neutral-900 dark:text-neutral-100 font-medium`;
		}
		return `${baseClass} hover:text-neutral-900 dark:hover:text-neutral-100`;
	}
</script>

<footer
	class="mt-10 border-t bg-neutral-50 px-4 py-8 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
>
	<!-- Disclaimer legal -->
	<div class="mx-auto mb-6 max-w-[1000px] text-center">
		<p class="prose prose-neutral dark:prose-invert max-w-none text-xs">
			La marca Flybondi es de FB Líneas Aéreas S.A. Este sitio web no está afiliado, respaldado ni
			patrocinado por FB Líneas Aéreas S.A. Todos los derechos asociados a la marca y su uso están
			reservados a su propietario legítimo. El uso de la marca en este sitio es únicamente
			informativo. No nos hacemos responsables de los errores que puedan haber en la información
			presentada.
		</p>
	</div>

	<!-- Grid de columnas -->
	<div class="mx-auto grid max-w-[1000px] grid-cols-1 gap-8 md:grid-cols-3">
		<!-- Columna: Datos -->
		<div class="flex flex-col gap-3">
			<h3 class="font-semibold text-neutral-900 dark:text-neutral-100">Datos</h3>
			<div class="flex flex-col gap-2">
				<a href="/" class={getLinkClass('/')}> Datos de hoy </a>
				<a href="/historico" class={getLinkClass('/historico')}>
					Estadísticas históricas diarias
				</a>
				<a href="/historico-meses" class={getLinkClass('/historico-meses')}>
					Estadísticas históricas mensuales
				</a>
				<a href="/aeropuertos" class={getLinkClass('/aeropuertos')}>
					Estadísticas por aeropuerto
				</a>
				<a href="/leaderboard" class={getLinkClass('/leaderboard')}> Ranking de aerolíneas </a>
			</div>
		</div>

		<!-- Columna: Información -->
		<div class="flex flex-col gap-3">
			<h3 class="font-semibold text-neutral-900 dark:text-neutral-100">Información</h3>
			<div class="flex flex-col gap-2">
				<a href="/acerca" class={getLinkClass('/acerca')}> Acerca del sitio, sus datos, etc </a>
				<a
					href="https://github.com/catdevnull/flybondi.fail"
					class="hover:text-neutral-900 dark:hover:text-neutral-100"
				>
					Código fuente
				</a>
			</div>
		</div>

		<!-- Columna: Contacto y Créditos -->
		<div class="flex flex-col gap-3">
			<h3 class="font-semibold text-neutral-900 dark:text-neutral-100">Contacto</h3>
			<div class="flex flex-col gap-2">
				<a
					href="https://x.com/esoesnulo"
					class="hover:text-neutral-900 dark:hover:text-neutral-100"
				>
					@esoesnulo
				</a>
				<a href="mailto:hola@nulo.lol" class="hover:text-neutral-900 dark:hover:text-neutral-100">
					hola@nulo.lol
				</a>

				<p class="text-xs">
					Failbondi.fail es un experimento de
					<a href="https://nulo.lol" class="hover:text-neutral-900 dark:hover:text-neutral-100">
						Nulo Science Inc™
					</a>.
				</p>
			</div>
		</div>
	</div>
</footer>
