<script lang="ts">
	import dayjs from 'dayjs';

	export let date: Date;
	export let baseDate: Date;

	const timeFormatter = Intl.DateTimeFormat('es-AR', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone: 'America/Argentina/Buenos_Aires'
	});

	function formatDateTime(timestamp: Date, baseDate: Date) {
		const curr = dayjs(baseDate);
		const formatted = timeFormatter.format(timestamp);
		const amntExtraDays = curr.isSame(timestamp, 'day') ? 0 : dayjs(timestamp).diff(curr, 'day');
		return { formatted, amntExtraDays };
	}

	$: ({ formatted, amntExtraDays } = formatDateTime(date, baseDate));
</script>

<span>
	{formatted}

	{#if amntExtraDays}
		<sup>+{amntExtraDays}</sup>
	{/if}
</span>
