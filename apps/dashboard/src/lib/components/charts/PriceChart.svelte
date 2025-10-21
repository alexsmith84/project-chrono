<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { DataProvider, PriceData } from '$lib/providers/types';

	// Props
	let { provider, symbol = 'BTC/USD', maxDataPoints = 100, height = 200 }: {
		provider: DataProvider<PriceData>;
		symbol?: string;
		maxDataPoints?: number;
		height?: number;
	} = $props();

	// State
	let container: HTMLDivElement;
	let priceHistory: PriceData[] = $state([]);
	let unsubscribe: (() => void) | null = null;
	let chartElement: HTMLElement | null = null;
	let updateTimer: NodeJS.Timeout | null = null;
	let needsRedraw = $state(false);
	let lastRenderTime = 0; // Track when we last rendered

	// Component instance logging
	console.log(`🔧 [PriceChart] Component instance created for ${provider?.name || 'unknown'} - ${symbol}`);

	// Subscribe to provider data updates using $effect (Svelte 5 way)
	$effect(() => {
		console.log(`✨ [PriceChart] $effect: Setting up subscription for ${provider?.name} - ${symbol}`);

		if (!provider) {
			console.error('[PriceChart] $effect - no provider!');
			return;
		}

		try {
			console.log(`[PriceChart] Subscribing to ${provider.name} data updates for ${symbol}`);

			unsubscribe = provider.onData((data: PriceData) => {
				console.log(`[PriceChart] 📨 onData callback triggered for ${provider.name}`, data);

				// Only track data for our symbol
				if (data.symbol !== symbol) {
					console.log(`[PriceChart] Ignoring data - symbol mismatch: ${data.symbol} !== ${symbol}`);
					return;
				}

				// Add to history
				console.log(`[PriceChart] Adding data point to history. Current length: ${priceHistory.length}`);
				const wasEmpty = priceHistory.length === 0;
				priceHistory = [...priceHistory, data].slice(-maxDataPoints);
				console.log(`[PriceChart] New history length: ${priceHistory.length}`);

				// Throttle rendering (not debounce!)
				// This ensures we render at most once every 2 seconds
				const now = Date.now();
				const timeSinceLastRender = now - lastRenderTime;

				if (wasEmpty) {
					// First data point - render immediately
					console.log(`[PriceChart] First data point - rendering immediately`);
					needsRedraw = true;
					lastRenderTime = now;
				} else if (timeSinceLastRender >= 2000) {
					// Enough time has passed - render now
					console.log(`[PriceChart] ${timeSinceLastRender}ms since last render - rendering now`);
					needsRedraw = true;
					lastRenderTime = now;
				} else {
					// Too soon - schedule render for later (only if not already scheduled)
					if (!updateTimer) {
						const delay = 2000 - timeSinceLastRender;
						console.log(`[PriceChart] Scheduling render in ${delay}ms`);
						updateTimer = setTimeout(() => {
							needsRedraw = true;
							lastRenderTime = Date.now();
							updateTimer = null;
						}, delay);
					} else {
						console.log(`[PriceChart] Render already scheduled, skipping`);
					}
				}
			});

			console.log(`[PriceChart] ✅ Subscribed to ${provider.name} data updates. Callback count:`, provider.callbacks?.length || 'unknown');
		} catch (error) {
			console.error(`[PriceChart] ❌ Error in $effect for ${provider.name}:`, error);
		}

		// Cleanup function - runs when effect re-runs or component unmounts
		return () => {
			console.log(`[PriceChart] 🧹 Cleanup for ${provider.name} - ${symbol}`);
			unsubscribe?.();
		};
	});

	// Separate effect for rendering chart when needsRedraw changes
	$effect(() => {
		console.log(`[PriceChart] Render effect triggered. needsRedraw=${needsRedraw}, container=${!!container}, dataLength=${priceHistory.length}`);

		// Only redraw when explicitly flagged
		if (!needsRedraw || !container || priceHistory.length === 0) {
			console.log(`[PriceChart] Skipping render: needsRedraw=${needsRedraw}, container=${!!container}, dataLength=${priceHistory.length}`);
			return;
		}

		console.log(`[PriceChart] 🎨 RENDERING CHART with ${priceHistory.length} data points`);
		needsRedraw = false; // Reset flag

		// Clear previous chart completely
		if (chartElement) {
			chartElement.remove();
			chartElement = null;
		}

		// Also clear container to be safe
		while (container.firstChild) {
			container.removeChild(container.firstChild);
		}

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
					fillOpacity: 0.1
				}),
				// Price line (straight lines, no smoothing)
				Plot.lineY(priceHistory, {
					x: 'timestamp',
					y: 'price',
					stroke: provider.color,
					strokeWidth: 2
				}),
				// Dot for each data point
				Plot.dot(priceHistory, {
					x: 'timestamp',
					y: 'price',
					fill: provider.color,
					r: 3
				}),
				// Horizontal line at latest price
				Plot.ruleY([priceHistory[priceHistory.length - 1].price], {
					stroke: provider.color,
					strokeDasharray: '4,4',
					strokeOpacity: 0.3
				})
			]
		});

		chartElement = chart;
		container.appendChild(chart);
	});

	// Format price for display
	function formatPrice(price: number | undefined): string {
		if (!price) return '-';
		return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}

	// Get latest price (Svelte 5 derived state)
	let latestPrice = $derived(priceHistory[priceHistory.length - 1]?.price);
	let priceChange = $derived(
		priceHistory.length > 1
			? ((latestPrice - priceHistory[0].price) / priceHistory[0].price) * 100
			: 0
	);
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
		<span class="badge status-{provider.status}">
			{provider.status}
		</span>
		{#if !provider.isActive}
			<span class="badge excluded">EXCLUDED</span>
		{/if}
		{#if provider.latency}
			<span class="badge latency">
				{provider.latency}ms
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
