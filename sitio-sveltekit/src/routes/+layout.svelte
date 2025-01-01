<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="min-h-screen bg-white p-4 dark:bg-gray-900">
	{@render children()}
</div>
