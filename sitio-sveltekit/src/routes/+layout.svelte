<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="min-h-screen bg-white p-4 dark:bg-neutral-900">
	{@render children()}
</div>
