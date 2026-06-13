import { dev } from '$app/environment';

export async function timed<T>(label: string, work: Promise<T>): Promise<T> {
	const start = performance.now();
	try {
		return await work;
	} finally {
		if (dev) {
			console.info(`[timing] ${label} ${Math.round(performance.now() - start)}ms`);
		}
	}
}

export function createTimings() {
	const timings: { label: string; duration: number }[] = [];

	return {
		async timed<T>(label: string, work: Promise<T>): Promise<T> {
			const start = performance.now();
			try {
				return await work;
			} finally {
				const duration = performance.now() - start;
				timings.push({ label, duration });
				if (dev) {
					console.info(`[timing] ${label} ${Math.round(duration)}ms`);
				}
			}
		},
		header() {
			return timings
				.map(
					({ label, duration }) =>
						`${label.replace(/[^A-Za-z0-9_-]/g, '_')};dur=${duration.toFixed(1)}`
				)
				.join(', ');
		}
	};
}
