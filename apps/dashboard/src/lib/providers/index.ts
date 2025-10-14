/**
 * Provider System Initialization
 *
 * Auto-registers all available providers
 * Export this module to initialize the provider system
 */

import { providerRegistry } from './registry';
import { CoinbaseProvider } from './exchanges/CoinbaseProvider';
import { BinanceProvider } from './exchanges/BinanceProvider';
import { KrakenProvider } from './exchanges/KrakenProvider';

// Re-export for convenience
export { providerRegistry } from './registry';
export * from './types';

/**
 * Initialize and register all providers
 * Call this once at app startup
 */
export async function initializeProviders(config?: {
	wsUrl?: string;
	symbols?: string[];
	autoConnect?: boolean;
}): Promise<void> {
	console.log('🚀 Initializing Project Chrono provider system...');

	// Register exchange providers
	providerRegistry.register(new CoinbaseProvider());
	providerRegistry.register(new BinanceProvider());
	providerRegistry.register(new KrakenProvider());

	// Future providers can be added here with one line:
	// providerRegistry.register(new BybitProvider());
	// providerRegistry.register(new TwitterSentimentProvider());
	// providerRegistry.register(new FearGreedIndexProvider());

	console.log(`✅ Registered ${providerRegistry.getAll().length} providers`);

	// Auto-connect if requested
	if (config?.autoConnect) {
		await providerRegistry.connectAll({
			wsUrl: config.wsUrl,
			symbols: config.symbols
		});
	}
}

/**
 * Cleanup all providers
 * Call this on app unmount
 */
export function cleanupProviders(): void {
	console.log('🧹 Cleaning up providers...');
	providerRegistry.disconnectAll();
}
