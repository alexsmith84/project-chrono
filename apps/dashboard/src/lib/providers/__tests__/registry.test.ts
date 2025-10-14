/**
 * Tests for Provider Registry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderRegistry } from '../registry';
import { BaseProvider } from '../BaseProvider';
import type { ProviderConfig } from '../types';

// Mock provider for testing
class MockProvider extends BaseProvider {
	readonly id = 'mock-provider';
	readonly name = 'Mock Provider';
	readonly category = 'exchange' as const;
	readonly dataType = 'price' as const;
	readonly color = '#000000';

	async connect(_config?: ProviderConfig): Promise<void> {
		this.setStatus('connected');
	}

	disconnect(): void {
		this.setStatus('disconnected');
	}
}

class MockProvider2 extends BaseProvider {
	readonly id = 'mock-provider-2';
	readonly name = 'Mock Provider 2';
	readonly category = 'sentiment' as const;
	readonly dataType = 'sentiment' as const;
	readonly color = '#FFFFFF';

	async connect(_config?: ProviderConfig): Promise<void> {
		this.setStatus('connected');
	}

	disconnect(): void {
		this.setStatus('disconnected');
	}
}

describe('ProviderRegistry', () => {
	let registry: ProviderRegistry;
	let provider1: MockProvider;
	let provider2: MockProvider2;

	beforeEach(() => {
		registry = new ProviderRegistry();
		provider1 = new MockProvider();
		provider2 = new MockProvider2();
	});

	describe('register', () => {
		it('should register a new provider', () => {
			registry.register(provider1);
			expect(registry.get('mock-provider')).toBe(provider1);
		});

		it('should update stores when registering', () => {
			registry.register(provider1);
			expect(registry.getAll()).toHaveLength(1);
			expect(registry.$providerCount.get()).toBe(1);
		});

		it('should warn when registering duplicate provider', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			registry.register(provider1);
			registry.register(provider1);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('already registered')
			);

			consoleSpy.mockRestore();
		});

		it('should register multiple providers', () => {
			registry.register(provider1);
			registry.register(provider2);

			expect(registry.getAll()).toHaveLength(2);
			expect(registry.get('mock-provider')).toBe(provider1);
			expect(registry.get('mock-provider-2')).toBe(provider2);
		});
	});

	describe('unregister', () => {
		it('should unregister a provider', () => {
			registry.register(provider1);
			const result = registry.unregister('mock-provider');

			expect(result).toBe(true);
			expect(registry.get('mock-provider')).toBeUndefined();
		});

		it('should disconnect provider when unregistering', () => {
			const disconnectSpy = vi.spyOn(provider1, 'disconnect');

			registry.register(provider1);
			registry.unregister('mock-provider');

			expect(disconnectSpy).toHaveBeenCalled();
		});

		it('should return false for non-existent provider', () => {
			const result = registry.unregister('non-existent');
			expect(result).toBe(false);
		});
	});

	describe('get', () => {
		it('should get provider by id', () => {
			registry.register(provider1);
			expect(registry.get('mock-provider')).toBe(provider1);
		});

		it('should return undefined for non-existent provider', () => {
			expect(registry.get('non-existent')).toBeUndefined();
		});
	});

	describe('getAll', () => {
		it('should return empty array when no providers', () => {
			expect(registry.getAll()).toEqual([]);
		});

		it('should return all registered providers', () => {
			registry.register(provider1);
			registry.register(provider2);

			const all = registry.getAll();
			expect(all).toHaveLength(2);
			expect(all).toContain(provider1);
			expect(all).toContain(provider2);
		});
	});

	describe('getByCategory', () => {
		it('should filter providers by category', () => {
			registry.register(provider1);
			registry.register(provider2);

			const exchanges = registry.getByCategory('exchange');
			expect(exchanges).toHaveLength(1);
			expect(exchanges[0]).toBe(provider1);

			const sentiment = registry.getByCategory('sentiment');
			expect(sentiment).toHaveLength(1);
			expect(sentiment[0]).toBe(provider2);
		});

		it('should return empty array for category with no providers', () => {
			registry.register(provider1);
			expect(registry.getByCategory('commodity')).toEqual([]);
		});
	});

	describe('getActive', () => {
		it('should return only active providers', () => {
			provider1.isActive = true;
			provider2.isActive = false;

			registry.register(provider1);
			registry.register(provider2);

			const active = registry.getActive();
			expect(active).toHaveLength(1);
			expect(active[0]).toBe(provider1);
		});

		it('should return all providers when all are active', () => {
			provider1.isActive = true;
			provider2.isActive = true;

			registry.register(provider1);
			registry.register(provider2);

			expect(registry.getActive()).toHaveLength(2);
		});
	});

	describe('getCollecting', () => {
		it('should return only collecting providers', () => {
			provider1.isCollecting = true;
			provider2.isCollecting = false;

			registry.register(provider1);
			registry.register(provider2);

			const collecting = registry.getCollecting();
			expect(collecting).toHaveLength(1);
			expect(collecting[0]).toBe(provider1);
		});
	});

	describe('getCategories', () => {
		it('should return unique categories', () => {
			registry.register(provider1);
			registry.register(provider2);

			const categories = registry.getCategories();
			expect(categories).toHaveLength(2);
			expect(categories).toContain('exchange');
			expect(categories).toContain('sentiment');
		});

		it('should not duplicate categories', () => {
			const provider3 = new MockProvider();
			provider3.isActive = true;

			registry.register(provider1);
			registry.register(provider3);

			const categories = registry.getCategories();
			expect(categories).toHaveLength(1);
			expect(categories).toContain('exchange');
		});
	});

	describe('toggleActive', () => {
		it('should toggle provider active state', () => {
			registry.register(provider1);

			expect(provider1.isActive).toBe(true);
			registry.toggleActive('mock-provider');
			expect(provider1.isActive).toBe(false);
			registry.toggleActive('mock-provider');
			expect(provider1.isActive).toBe(true);
		});

		it('should return new active state', () => {
			registry.register(provider1);

			const result1 = registry.toggleActive('mock-provider');
			expect(result1).toBe(false);

			const result2 = registry.toggleActive('mock-provider');
			expect(result2).toBe(true);
		});

		it('should return false for non-existent provider', () => {
			const result = registry.toggleActive('non-existent');
			expect(result).toBe(false);
		});
	});

	describe('setActive', () => {
		it('should set provider active state', () => {
			registry.register(provider1);

			registry.setActive('mock-provider', false);
			expect(provider1.isActive).toBe(false);

			registry.setActive('mock-provider', true);
			expect(provider1.isActive).toBe(true);
		});

		it('should return false for non-existent provider', () => {
			const result = registry.setActive('non-existent', true);
			expect(result).toBe(false);
		});
	});

	describe('getMetadata', () => {
		it('should return provider metadata', () => {
			registry.register(provider1);

			const metadata = registry.getMetadata('mock-provider');

			expect(metadata).toEqual({
				id: 'mock-provider',
				name: 'Mock Provider',
				category: 'exchange',
				color: '#000000',
				isActive: true,
				isCollecting: false,
				status: 'disconnected',
				latency: null,
				lastUpdate: null
			});
		});

		it('should return null for non-existent provider', () => {
			const metadata = registry.getMetadata('non-existent');
			expect(metadata).toBeNull();
		});
	});

	describe('getAllMetadata', () => {
		it('should return metadata for all providers', () => {
			registry.register(provider1);
			registry.register(provider2);

			const metadata = registry.getAllMetadata();

			expect(metadata).toHaveLength(2);
			expect(metadata[0].id).toBe('mock-provider');
			expect(metadata[1].id).toBe('mock-provider-2');
		});

		it('should return empty array when no providers', () => {
			expect(registry.getAllMetadata()).toEqual([]);
		});
	});

	describe('connectAll', () => {
		it('should connect all providers', async () => {
			const connectSpy1 = vi.spyOn(provider1, 'connect');
			const connectSpy2 = vi.spyOn(provider2, 'connect');

			registry.register(provider1);
			registry.register(provider2);

			await registry.connectAll();

			expect(connectSpy1).toHaveBeenCalled();
			expect(connectSpy2).toHaveBeenCalled();
		});

		it('should pass config to providers', async () => {
			const connectSpy = vi.spyOn(provider1, 'connect');

			registry.register(provider1);

			const config = { 'mock-provider': { wsUrl: 'ws://test' } };
			await registry.connectAll(config);

			expect(connectSpy).toHaveBeenCalledWith({ wsUrl: 'ws://test' });
		});
	});

	describe('disconnectAll', () => {
		it('should disconnect all providers', () => {
			const disconnectSpy1 = vi.spyOn(provider1, 'disconnect');
			const disconnectSpy2 = vi.spyOn(provider2, 'disconnect');

			registry.register(provider1);
			registry.register(provider2);

			registry.disconnectAll();

			expect(disconnectSpy1).toHaveBeenCalled();
			expect(disconnectSpy2).toHaveBeenCalled();
		});
	});

	describe('clear', () => {
		it('should remove all providers', () => {
			registry.register(provider1);
			registry.register(provider2);

			expect(registry.getAll()).toHaveLength(2);

			registry.clear();

			expect(registry.getAll()).toHaveLength(0);
			expect(registry.$providerCount.get()).toBe(0);
		});

		it('should disconnect all providers before clearing', () => {
			const disconnectSpy1 = vi.spyOn(provider1, 'disconnect');
			const disconnectSpy2 = vi.spyOn(provider2, 'disconnect');

			registry.register(provider1);
			registry.register(provider2);

			registry.clear();

			expect(disconnectSpy1).toHaveBeenCalled();
			expect(disconnectSpy2).toHaveBeenCalled();
		});
	});

	describe('reactive stores', () => {
		it('should update $providerCount store', () => {
			expect(registry.$providerCount.get()).toBe(0);

			registry.register(provider1);
			expect(registry.$providerCount.get()).toBe(1);

			registry.register(provider2);
			expect(registry.$providerCount.get()).toBe(2);

			registry.unregister('mock-provider');
			expect(registry.$providerCount.get()).toBe(1);
		});

		it('should update $activeProviders store', () => {
			provider1.isActive = true;
			provider2.isActive = false;

			registry.register(provider1);
			registry.register(provider2);

			expect(registry.$activeProviders.get()).toHaveLength(1);

			registry.setActive('mock-provider-2', true);
			expect(registry.$activeProviders.get()).toHaveLength(2);
		});
	});
});
