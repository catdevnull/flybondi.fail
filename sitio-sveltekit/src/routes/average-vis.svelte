<script lang="ts">
	import * as d3 from 'd3';

	import FlybondiSvg from '$lib/assets/flybondi.svg?raw';
	import AerolineasArgentinasSvg from '$lib/assets/aerolineas-argentinas.svg?raw';
	import { COLORS, getDelaySimplified } from '@/colors';

	let svgEl: SVGSVGElement;
	let width: number;

	export let airlineData: {
		name: string;
		avgDelay: number;
	}[];
	const height = 90; // Increased from 100

	function updateChart() {
		const svg = d3.select(svgEl);
		const margin = { top: 0, right: 10, bottom: 20, left: 60 }; // Increased left margin for bigger logos

		const x = d3
			.scaleLinear()
			.domain([0, 180]) // 3 hours in minutes
			.range([margin.left, width - margin.right]);

		const y = d3
			.scaleBand()
			.domain(airlineData.map((d) => d.name))
			.range([margin.top, height - margin.bottom])
			.padding(0.2); // Increased padding for taller bars

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
			.attr('y', (d) => y(d.name))
			.attr('width', x(180) - x(0))
			.attr('height', y.bandwidth())
			.attr('fill', '#ddd');

		svg
			.selectAll('.bar')
			.data(airlineData)
			.enter()
			.append('rect')
			.attr('class', 'bar')
			.attr('x', x(0))
			.attr('y', (d) => y(d.name))
			.attr('width', (d) => x(d.avgDelay) - x(0))
			.attr('height', y.bandwidth())
			.attr('fill', (d) => COLORS[getDelaySimplified(d.avgDelay * 60)]);

		// Add airline logos
		svg
			.selectAll('.logo')
			.data(airlineData)
			.enter()
			.append('image')
			.attr('class', 'logo')
			.attr('x', margin.left - 60) // Moved further left
			.attr('y', (d) => y(d.name) - 5) // Adjusted y position
			.attr('width', 50) // Increased from 40
			.attr('height', y.bandwidth() + 10) // Made slightly taller
			.attr(
				'href',
				(d) =>
					`data:image/svg+xml,${encodeURIComponent(
						(d.name === 'Flybondi' ? FlybondiSvg : AerolineasArgentinasSvg).replace(
							`</style>`,
							`</style><style>*{fill: #333 !important}</style>`
						)
					)}`
			)
			.attr('preserveAspectRatio', 'xMidYMid meet');

		// Add labels
		svg
			.selectAll('.label')
			.data(airlineData)
			.enter()
			.append('text')
			.attr('class', 'label')
			.attr('x', (d) => x(d.avgDelay) + 5)
			.attr('y', (d) => y(d.name) + y.bandwidth() / 2)
			.attr('dy', '0.35em')
			.text((d) => {
				const hours = Math.floor(d.avgDelay / 60);
				const minutes = Math.floor(d.avgDelay % 60);
				return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}hs` : `${minutes}min`;
			})
			.attr('fill', '#333')
			.attr('font-family', 'Arial')
			.attr('font-size', '14px');

		// Add x-axis
		const xAxis = d3
			.axisBottom(x)
			.tickValues([0, 60, 120, 180])
			.tickSize(0)
			.tickFormat((d: number) => `${d / 60}hs`);

		svg
			.append('g')
			.attr('transform', `translate(0,${height - margin.bottom})`)
			.call(xAxis)
			.selectAll('text')
			.attr('font-family', 'Arial')
			.attr('font-size', '12px');

		svg.selectAll('.domain').remove();
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

	.chart-container :global(.logo) {
		filter: grayscale(100%) !important;
	}
</style>
