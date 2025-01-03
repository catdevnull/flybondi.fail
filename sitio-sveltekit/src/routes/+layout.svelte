<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="min-h-screen bg-white p-4 dark:bg-neutral-900 dark:text-neutral-200">
	{@render children()}
</div>
