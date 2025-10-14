<script lang="ts">
	import { onMount } from 'svelte';
	import * as Plot from '@observablehq/plot';
	import type { DataProvider, PriceData } from '$lib/providers/types';

	// Props
	export let provider: DataProvider<PriceData>;
	export let symbol: string = 'BTC/USD';
	export let maxDataPoints: number = 100;
	export let height: number = 200;

	// State
	let container: HTMLDivElement;
	let priceHistory: PriceData[] = [];
	let unsubscribe: (() => void) | null = null;

	// Subscribe to provider data updates
	onMount(() => {
		if (!provider) return;

		unsubscribe = provider.onData((data: PriceData) => {
			// Only track data for our symbol
			if (data.symbol !== symbol) return;

			// Add to history
			priceHistory = [...priceHistory, data].slice(-maxDataPoints);

			// Redraw chart
			renderChart();
		});

		// Initial render
		renderChart();

		// Cleanup function (Svelte 5 way)
		return () => {
			unsubscribe?.();
		};
	});

	function renderChart() {
		if (!container || priceHistory.length === 0) return;

		// Clear previous chart
		container.innerHTML = '';

		// Create Observable Plot chart
		const chart = Plot.plot({
			height,
			marginLeft: 60,
			marginRight: 20,
			marginTop: 20,
			marginBottom: 30,
			y: {
				grid: true,
				label: 'Price (USD)',
				tickFormat: (d) => `$${d.toLocaleString()}`
			},
			x: {
				label: 'Time',
				type: 'time',
				tickFormat: (d) => {
					const date = new Date(d);
					return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
				}
			},
			color: {
				legend: false
			},
			marks: [
				// Area under the line
				Plot.areaY(priceHistory, {
					x: 'timestamp',
					y: 'price',
					fill: provider.color,
					fillOpacity: 0.1,
					curve: 'catmull-rom'
				}),
				// Price line
				Plot.lineY(priceHistory, {
					x: 'timestamp',
					y: 'price',
					stroke: provider.color,
					strokeWidth: 2,
					curve: 'catmull-rom'
				}),
				// Latest price dot
				Plot.dot([priceHistory[priceHistory.length - 1]], {
					x: 'timestamp',
					y: 'price',
					fill: provider.color,
					r: 4
				}),
				// Horizontal line at latest price
				Plot.ruleY([priceHistory[priceHistory.length - 1].price], {
					stroke: provider.color,
					strokeDasharray: '4,4',
					strokeOpacity: 0.3
				})
			]
		});

		container.appendChild(chart);
	}

	// Format price for display
	function formatPrice(price: number | undefined): string {
		if (!price) return '-';
		return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}

	// Get latest price
	$: latestPrice = priceHistory[priceHistory.length - 1]?.price;
	$: priceChange = priceHistory.length > 1
		? ((latestPrice - priceHistory[0].price) / priceHistory[0].price) * 100
		: 0;
</script>

<div class="price-chart-container" class:inactive={!provider.isActive}>
	<!-- Header -->
	<div class="chart-header">
		<div class="chart-title">
			<span class="provider-name" style="color: {provider.color}">
				{provider.name}
			</span>
			<span class="symbol">{symbol}</span>
		</div>

		<div class="chart-stats">
			<div class="latest-price">
				{formatPrice(latestPrice)}
			</div>
			{#if priceHistory.length > 1}
				<div class="price-change" class:positive={priceChange > 0} class:negative={priceChange < 0}>
					{priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
				</div>
			{/if}
		</div>
	</div>

	<!-- Status badges -->
	<div class="status-badges">
		<span class="badge status-{provider.getConnectionStatus()}">
			{provider.getConnectionStatus()}
		</span>
		{#if !provider.isActive}
			<span class="badge excluded">EXCLUDED</span>
		{/if}
		{#if provider.getLatency()}
			<span class="badge latency">
				{provider.getLatency()}ms
			</span>
		{/if}
	</div>

	<!-- Chart -->
	<div bind:this={container} class="chart"></div>

	<!-- Data points info -->
	<div class="chart-footer">
		<span class="data-points">{priceHistory.length} data points</span>
	</div>
</div>

<style>
	.price-chart-container {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 16px;
		transition: all 0.3s ease;
	}

	.price-chart-container.inactive {
		opacity: 0.5;
		filter: grayscale(100%);
		border-color: #d1d5db;
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 12px;
	}

	.chart-title {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.provider-name {
		font-size: 18px;
		font-weight: 600;
	}

	.symbol {
		font-size: 14px;
		color: #6b7280;
	}

	.chart-stats {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.latest-price {
		font-size: 24px;
		font-weight: 700;
		color: #111827;
	}

	.price-change {
		font-size: 14px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.price-change.positive {
		color: #059669;
		background: #d1fae5;
	}

	.price-change.negative {
		color: #dc2626;
		background: #fee2e2;
	}

	.status-badges {
		display: flex;
		gap: 8px;
		margin-bottom: 12px;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		padding: 4px 8px;
		border-radius: 4px;
		letter-spacing: 0.5px;
	}

	.badge.status-connected {
		background: #d1fae5;
		color: #059669;
	}

	.badge.status-connecting {
		background: #fef3c7;
		color: #d97706;
	}

	.badge.status-disconnected {
		background: #f3f4f6;
		color: #6b7280;
	}

	.badge.status-error {
		background: #fee2e2;
		color: #dc2626;
	}

	.badge.excluded {
		background: #fee2e2;
		color: #dc2626;
	}

	.badge.latency {
		background: #dbeafe;
		color: #2563eb;
	}

	.chart {
		margin: 12px 0;
		overflow-x: auto;
	}

	.chart-footer {
		display: flex;
		justify-content: flex-end;
		font-size: 12px;
		color: #9ca3af;
	}

	.data-points {
		font-style: italic;
	}
</style>
