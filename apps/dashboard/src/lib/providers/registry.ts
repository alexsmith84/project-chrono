/**
 * Provider Registry
 *
 * Central registry for all data providers using singleton pattern
 * Supports auto-discovery, category filtering, and dynamic toggling
 */

import type { DataProvider, ProviderCategory, ProviderMetadata } from './types';
import { atom, map } from 'nanostores';

/**
 * Singleton provider registry
 */
class ProviderRegistry {
	private providers = new Map<string, DataProvider>();

	// Reactive stores for Svelte integration
	public $providers = map<Record<string, DataProvider>>({});
	public $activeProviders = atom<DataProvider[]>([]);
	public $providerCount = atom<number>(0);

	/**
	 * Register a new provider
	 */
	register(provider: DataProvider): void {
		if (this.providers.has(provider.id)) {
			console.warn(`Provider ${provider.id} is already registered`);
			return;
		}

		this.providers.set(provider.id, provider);
		this.updateStores();

		console.log(`✅ Registered provider: ${provider.name} (${provider.category})`);
	}

	/**
	 * Unregister a provider
	 */
	unregister(id: string): boolean {
		const provider = this.providers.get(id);
		if (!provider) {
			return false;
		}

		provider.disconnect();
		const deleted = this.providers.delete(id);

		if (deleted) {
			this.updateStores();
			console.log(`❌ Unregistered provider: ${provider.name}`);
		}

		return deleted;
	}

	/**
	 * Get a specific provider by ID
	 */
	get(id: string): DataProvider | undefined {
		return this.providers.get(id);
	}

	/**
	 * Get all registered providers
	 */
	getAll(): DataProvider[] {
		return Array.from(this.providers.values());
	}

	/**
	 * Get providers by category
	 */
	getByCategory(category: ProviderCategory): DataProvider[] {
		return this.getAll().filter((p) => p.category === category);
	}

	/**
	 * Get only active providers (included in calculations)
	 */
	getActive(): DataProvider[] {
		return this.getAll().filter((p) => p.isActive);
	}

	/**
	 * Get only collecting providers (currently connected)
	 */
	getCollecting(): DataProvider[] {
		return this.getAll().filter((p) => p.isCollecting);
	}

	/**
	 * Get all unique categories
	 */
	getCategories(): ProviderCategory[] {
		const categories = new Set<ProviderCategory>();
		this.getAll().forEach((p) => categories.add(p.category));
		return Array.from(categories);
	}

	/**
	 * Toggle provider active state
	 */
	toggleActive(id: string): boolean {
		const provider = this.providers.get(id);
		if (!provider) {
			return false;
		}

		provider.isActive = !provider.isActive;
		this.updateStores();

		console.log(
			`${provider.isActive ? '✅' : '⏸️'} ${provider.name} ${
				provider.isActive ? 'included in' : 'excluded from'
			} calculations`
		);

		return provider.isActive;
	}

	/**
	 * Set provider active state
	 */
	setActive(id: string, active: boolean): boolean {
		const provider = this.providers.get(id);
		if (!provider) {
			return false;
		}

		provider.isActive = active;
		this.updateStores();

		return true;
	}

	/**
	 * Get provider metadata for UI display
	 */
	getMetadata(id: string): ProviderMetadata | null {
		const provider = this.providers.get(id);
		if (!provider) {
			return null;
		}

		return {
			id: provider.id,
			name: provider.name,
			category: provider.category,
			color: provider.color,
			isActive: provider.isActive,
			isCollecting: provider.isCollecting,
			status: provider.getConnectionStatus(),
			latency: provider.getLatency(),
			lastUpdate: provider.getLastUpdate()
		};
	}

	/**
	 * Get metadata for all providers
	 */
	getAllMetadata(): ProviderMetadata[] {
		return this.getAll()
			.map((p) => this.getMetadata(p.id))
			.filter((m): m is ProviderMetadata => m !== null);
	}

	/**
	 * Connect all providers
	 */
	async connectAll(config?: Record<string, any>): Promise<void> {
		const promises = this.getAll().map((provider) =>
			provider.connect(config?.[provider.id])
		);

		await Promise.allSettled(promises);
		this.updateStores();
	}

	/**
	 * Disconnect all providers
	 */
	disconnectAll(): void {
		this.getAll().forEach((provider) => provider.disconnect());
		this.updateStores();
	}

	/**
	 * Clear all providers (useful for testing)
	 */
	clear(): void {
		this.disconnectAll();
		this.providers.clear();
		this.updateStores();
	}

	/**
	 * Update reactive stores
	 */
	private updateStores(): void {
		const providersObj: Record<string, DataProvider> = {};
		this.providers.forEach((provider, id) => {
			providersObj[id] = provider;
		});

		this.$providers.set(providersObj);
		this.$activeProviders.set(this.getActive());
		this.$providerCount.set(this.providers.size);
	}
}

// Export singleton instance
export const providerRegistry = new ProviderRegistry();

// Export class for testing
export { ProviderRegistry };
