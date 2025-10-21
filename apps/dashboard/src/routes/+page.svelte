<script lang="ts">
	import { browser } from '$app/environment';
	import { providerRegistry } from '$lib/providers';
	import { CoinbaseProvider } from '$lib/providers/exchanges/CoinbaseProvider';
	import { BinanceProvider } from '$lib/providers/exchanges/BinanceProvider';
	import { KrakenProvider } from '$lib/providers/exchanges/KrakenProvider';
	import PriceChart from '$lib/components/charts/PriceChart.svelte';
	import ProviderStatusCard from '$lib/components/ProviderStatusCard.svelte';

	// Environment variables
	const WS_URL = 'ws://localhost:3000/stream';
	const SYMBOLS = ['BTC/USD', 'ETH/USD'];

	// Reactive state - Svelte 5 runes
	let initialized = $state(false);
	let error = $state<string | null>(null);
	let debugMessage = $state('INITIAL STATE - onMount has not run yet');

	// Module-level code to verify script is loading
	console.log('📍 PAGE SCRIPT IS LOADING');
	debugMessage = 'Script loaded, waiting for onMount...';

	// CRITICAL: Initialize providers immediately in browser
	if (browser) {
		console.log('📍 BROWSER CHECK PASSED - initializing providers');
		debugMessage = '🔵 Browser detected, registering providers...';

		providerRegistry.clear();
		providerRegistry.register(new CoinbaseProvider());
		providerRegistry.register(new BinanceProvider());
		providerRegistry.register(new KrakenProvider());

		console.log('📍 After registration - store value:', providerRegistry.$providers.get());
		console.log('📍 After registration - provider count:', providerRegistry.$providerCount.get());

		// Expose registry to window for browser console testing
		if (typeof window !== 'undefined') {
			(window as any).__PROVIDER_REGISTRY__ = providerRegistry;
			console.log('🔧 Registry exposed to window.__PROVIDER_REGISTRY__ for console testing');
		}

		initialized = true;
		debugMessage = '🔵 Providers registered, about to connect...';

		// Connect immediately
		console.log('📍 CALLING connectAll');
		providerRegistry.connectAll({
			wsUrl: WS_URL,
			symbols: SYMBOLS
		}).then(() => {
			console.log('✅ All providers connected');
			debugMessage = '✅ All providers connected successfully!';
		}).catch((err) => {
			console.error('❌ Failed to connect providers:', err);
			error = err instanceof Error ? err.message : 'Connection error';
			debugMessage = '❌ Failed: ' + (err instanceof Error ? err.message : 'Unknown error');
		});
	} else {
		console.log('📍 NOT IN BROWSER - skipping initialization');
		debugMessage = '⚠️ Not in browser context';
	}

	// Extract stores from registry for Svelte reactivity
	const providersStore = providerRegistry.$providers;
	const activeProvidersStore = providerRegistry.$activeProviders;
	const providerCountStore = providerRegistry.$providerCount;

	// Derived reactive values - Svelte 5 style
	let providersList = $derived(Object.values($providersStore));
	let exchangeProviders = $derived(providersList.filter((p) => p.category === 'exchange'));

	// Debug logging
	$effect(() => {
		console.log('📊 Reactive update - providersList:', providersList.length, 'exchangeProviders:', exchangeProviders.length);
	});
</script>

<div class="dashboard-container">
	<!-- Header -->
	<header class="dashboard-header">
		<div>
			<h1 class="dashboard-title">Project Chrono FTSO Dashboard</h1>
			<p class="dashboard-subtitle">Real-time monitoring for FTSO data sources</p>
		</div>

		<div class="header-stats">
			<div class="stat-card">
				<span class="stat-value">{$providerCountStore}</span>
				<span class="stat-label">Total Providers</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{$activeProvidersStore.length}</span>
				<span class="stat-label">Active</span>
			</div>
		</div>
	</header>

	{#if debugMessage}
		<div class="debug-banner">
			{debugMessage}
		</div>
	{/if}

	{#if error}
		<div class="error-banner">
			<strong>Error:</strong> {error}
		</div>
	{/if}

	{#if !initialized}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Initializing providers...</p>
		</div>
	{:else if providersList.length === 0}
		<div class="empty-state">
			<p>No providers registered</p>
		</div>
	{:else}
		<!-- Provider Status Cards -->
		<section class="section">
			<h2 class="section-title">Exchange Status</h2>
			<div class="status-grid">
				{#each exchangeProviders as provider (provider.id)}
					<ProviderStatusCard {provider} />
				{/each}
			</div>
		</section>

		<!-- Price Charts -->
		<section class="section">
			<h2 class="section-title">Real-Time Price Charts</h2>

			{#each SYMBOLS as symbol (symbol)}
				<div class="symbol-section">
					<h3 class="symbol-title">{symbol}</h3>
					<div class="charts-grid">
						{#each exchangeProviders as provider (provider.id)}
							<PriceChart {provider} {symbol} maxDataPoints={50} height={250} />
						{/each}
					</div>
				</div>
			{/each}
		</section>

		<!-- Connection Info -->
		<section class="section">
			<div class="info-box">
				<h3>Connection Information</h3>
				<p><strong>WebSocket URL:</strong> {WS_URL}</p>
				<p><strong>Tracking Symbols:</strong> {SYMBOLS.join(', ')}</p>
				<p class="info-note">
					💡 Toggle providers on/off using the buttons above. Excluded providers continue collecting
					data but won't be included in price calculations.
				</p>
			</div>
		</section>
	{/if}
</div>

<style>
	.dashboard-container {
		min-height: 100vh;
		background: #f9fafb;
		padding: 32px;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 32px;
		background: white;
		padding: 32px;
		border-radius: 16px;
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
	}

	.dashboard-title {
		font-size: 32px;
		font-weight: 800;
		margin: 0 0 8px 0;
		color: #111827;
	}

	.dashboard-subtitle {
		font-size: 16px;
		color: #6b7280;
		margin: 0;
	}

	.header-stats {
		display: flex;
		gap: 16px;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 16px 24px;
		background: #f9fafb;
		border-radius: 12px;
		min-width: 120px;
	}

	.stat-value {
		font-size: 32px;
		font-weight: 800;
		color: #111827;
	}

	.stat-label {
		font-size: 13px;
		color: #6b7280;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.debug-banner {
		background: #dbeafe;
		border: 2px solid #3b82f6;
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 24px;
		color: #1e40af;
		font-weight: 600;
	}

	.error-banner {
		background: #fee2e2;
		border: 2px solid #dc2626;
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 24px;
		color: #991b1b;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 64px;
		background: white;
		border-radius: 16px;
		color: #6b7280;
	}

	.loading-spinner {
		width: 48px;
		height: 48px;
		border: 4px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.section {
		margin-bottom: 32px;
	}

	.section-title {
		font-size: 24px;
		font-weight: 700;
		color: #111827;
		margin: 0 0 20px 0;
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 20px;
	}

	.symbol-section {
		margin-bottom: 32px;
	}

	.symbol-title {
		font-size: 20px;
		font-weight: 600;
		color: #374151;
		margin: 0 0 16px 0;
	}

	.charts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 20px;
	}

	.info-box {
		background: #eff6ff;
		border: 2px solid #3b82f6;
		border-radius: 12px;
		padding: 24px;
	}

	.info-box h3 {
		margin: 0 0 16px 0;
		color: #1e40af;
		font-size: 18px;
		font-weight: 700;
	}

	.info-box p {
		margin: 8px 0;
		color: #1e3a8a;
		font-size: 14px;
	}

	.info-note {
		margin-top: 16px !important;
		padding-top: 16px;
		border-top: 1px solid #93c5fd;
		font-style: italic;
	}

	@media (max-width: 768px) {
		.dashboard-container {
			padding: 16px;
		}

		.dashboard-header {
			flex-direction: column;
			gap: 20px;
		}

		.charts-grid,
		.status-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
