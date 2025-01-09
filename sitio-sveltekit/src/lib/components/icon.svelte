<script lang="ts">
	export let icon:
		| 'fa6-solid-plane'
		| 'fa6-solid-plane-slash'
		| 'grommet-icons-info'
		| 'lucide-plane-takeoff'; // definidos en `+layout.svelte`
</script>

<svg {...$$restProps}>
	<use href={`#${icon}`} />
</svg>
