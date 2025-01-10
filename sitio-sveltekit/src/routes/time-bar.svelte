<script lang="ts">
	import { COLORS, getDelayColor, getDelaySimplified } from '@/colors';

	export let maxSeconds: number;
	export let seconds: number;
</script>

<div class="relative h-[3px] w-full">
	<div class="absolute h-full w-full bg-neutral-200 dark:bg-neutral-700"></div>
	<div
		class={`absolute h-full`}
		style={`width: ${(seconds / maxSeconds) * 100}%; background-color: ${COLORS[getDelaySimplified(seconds)]};`}
	></div>
</div>
