<script lang="ts">
	import * as d3 from 'd3';

	import FlybondiDerpSvg from '$lib/assets/flybondi-derp.svg?raw';
	import AerolineasArgentinasSvg from '$lib/assets/aerolineas-argentinas.svg?raw';
	import { COLORS, getDelaySimplified } from '@/colors';

	let svgEl: SVGSVGElement;
	let width: number;

	export let airlineData: {
		name: string;
		avgDelay: number;
		nVuelos: number;
		otherAerolineas?: string[];
	}[];
	const height = 180; // Increased height for taller bars

	const FONT_STACK = 'system-ui, sans-serif';

	const IATA_MAP = {
		WJ: 'JetSmart',
		G3: 'GOL',
		JJ: 'TAM',
		O4: 'Andes L.A.'
	};

	function updateChart() {
		const svg = d3.select(svgEl);
		const margin = { top: 10, right: 0, bottom: 5, left: 0 }; // Increased top margin for labels

		const x = d3
			.scaleLinear()
			.domain([0, 180]) // 3 hours in minutes
			.range([margin.left, width - margin.right]);

		const y = d3
			.scaleBand()
			.domain(airlineData.map((d) => d.name))
			.range([margin.top, height - margin.bottom])
			.padding(0.5); // Reduced padding to make bars taller

		// Clear existing content
		svg.selectAll('*').remove();

		// Add bars
		svg
			.selectAll('.bar-bg')
			.data(airlineData)
			.enter()
			.append('rect')
			.attr('class', 'bar-bg')
			.attr('x', x(0))
			.attr('y', (d) => y(d.name)!)
			.attr('width', x(180) - x(0))
			.attr('height', y.bandwidth());

		svg
			.selectAll('.bar')
			.data(airlineData)
			.enter()
			.append('rect')
			.attr('class', 'bar')
			.attr('x', x(0))
			.attr('y', (d) => y(d.name)!)
			.attr('width', (d) => x(d.avgDelay) - x(0))
			.attr('height', y.bandwidth())
			.attr('fill', (d) => COLORS[getDelaySimplified(d.avgDelay * 60)]);

		// Add labels above bars
		const barLabels = svg.selectAll('.bar-label').data(airlineData).enter().append('text');
		barLabels
			.attr('class', 'bar-label')
			.attr('x', x(0))
			.attr('y', (d) => y(d.name)! - 4) // Reduced space between bar and label to 2px
			.attr('text-anchor', 'start')
			.attr('fill', 'currentColor')
			.attr('font-family', FONT_STACK)
			.attr('font-size', '14px')
			.attr('font-weight', '500')
			.each(function (d) {
				const text = d3.select(this);
				text.text(d.name);
				text
					.append('tspan')
					// .attr('x', x(0))
					// .attr('dy', '1.2em')
					.attr('opacity', '0.5')
					.attr('font-size', '14px')
					.attr('font-weight', 'normal')
					.text(`  ${d.nVuelos} vuelos`)
					.append('tspan')
					.attr('class', 'hidden sm:block')
					.attr('font-size', '14px')
					.attr('font-weight', 'normal')

					.text(
						`${d.otherAerolineas ? ` (${d.otherAerolineas.map((a) => (IATA_MAP as any)[a] ?? a).join(', ')})` : ''}`
					);
			});

		// Add time labels
		svg
			.selectAll('.label')
			.data(airlineData)
			.enter()
			.append('text')
			.attr('class', 'label')
			.attr('x', (d) => x(d.avgDelay) + 5)
			.attr('y', (d) => y(d.name)! + y.bandwidth() / 2)
			.attr('dy', '0.35em')
			.text((d) => {
				const hours = Math.floor(d.avgDelay / 60);
				const minutes = Math.floor(d.avgDelay % 60);
				return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}hs` : `${minutes}min`;
			})
			.attr('fill', '#333')
			.attr('font-family', FONT_STACK)
			.attr('font-size', '14px');

		// Add x-axis
		const xAxis = d3
			.axisBottom(x)
			.tickValues([0, 60, 120, 180])
			.tickSize(0)
			.tickFormat((d: number) => `${d / 60}hs`);
		const ejex = svg
			.append('g')
			.attr('transform', `translate(0,${height - margin.bottom - 20})`)
			.call(xAxis);
		ejex
			.selectAll('text')
			.attr('font-family', FONT_STACK)
			.attr('font-size', '12px')
			.attr('opacity', '0.7');
		ejex.select('.domain').remove();
		ejex.select('.tick').attr('text-anchor', 'start');
		ejex.select('.tick:last-of-type').attr('text-anchor', 'end');
	}

	$: if (svgEl && width && airlineData) {
		updateChart();
	}
</script>

<div class="chart-container" bind:clientWidth={width}>
	<svg bind:this={svgEl} width="100%" {height}></svg>
</div>

<style>
	.chart-container {
		width: 100%;
		max-width: 800px;
	}

	.chart-container :global(.bar-bg) {
		fill: #e5e5e5;
	}

	.chart-container :global(.label) {
		fill: #333;
	}

	@media (prefers-color-scheme: dark) {
		.chart-container :global(.bar-bg) {
			fill: #404040;
		}

		.chart-container :global(.label) {
			fill: #ccc;
		}
	}
</style>
