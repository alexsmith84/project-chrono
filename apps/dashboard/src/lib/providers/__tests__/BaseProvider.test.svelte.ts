/**
 * Tests for BaseProvider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseProvider } from '../BaseProvider.svelte';
import type { ProviderConfig } from '../types';

// Concrete implementation for testing
class TestProvider extends BaseProvider<{ value: number }> {
	readonly id = 'test-provider';
	readonly name = 'Test Provider';
	readonly category = 'exchange' as const;
	readonly dataType = 'price' as const;
	readonly color = '#FF0000';

	async connect(_config?: ProviderConfig): Promise<void> {
		this.setStatus('connected');
	}

	disconnect(): void {
		this.setStatus('disconnected');
	}

	// Expose protected methods for testing
	public testNotifySubscribers(data: { value: number }): void {
		this.notifySubscribers(data);
	}

	public testSetStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
		this.setStatus(status);
	}

	public testUpdateLatency(startTime: number): void {
		this.updateLatency(startTime);
	}
}

describe('BaseProvider', () => {
	let provider: TestProvider;

	beforeEach(() => {
		provider = new TestProvider();
	});

	describe('initialization', () => {
		it('should have correct default state', () => {
			expect(provider.isActive).toBe(true);
			expect(provider.isCollecting).toBe(false);
			expect(provider.getConnectionStatus()).toBe('disconnected');
			expect(provider.getLatency()).toBeNull();
			expect(provider.getLastUpdate()).toBeNull();
			expect(provider.getData()).toBeNull();
		});

		it('should have required properties', () => {
			expect(provider.id).toBe('test-provider');
			expect(provider.name).toBe('Test Provider');
			expect(provider.category).toBe('exchange');
			expect(provider.dataType).toBe('price');
			expect(provider.color).toBe('#FF0000');
		});
	});

	describe('getData', () => {
		it('should return null initially', () => {
			expect(provider.getData()).toBeNull();
		});

		it('should return latest data after notification', () => {
			const data = { value: 42 };
			provider.testNotifySubscribers(data);

			expect(provider.getData()).toEqual(data);
		});
	});

	describe('onData', () => {
		it('should register callback', () => {
			const callback = vi.fn();
			provider.onData(callback);

			provider.testNotifySubscribers({ value: 10 });

			expect(callback).toHaveBeenCalledWith({ value: 10 });
		});

		it('should support multiple callbacks', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			provider.onData(callback1);
			provider.onData(callback2);

			provider.testNotifySubscribers({ value: 20 });

			expect(callback1).toHaveBeenCalledWith({ value: 20 });
			expect(callback2).toHaveBeenCalledWith({ value: 20 });
		});

		it('should return unsubscribe function', () => {
			const callback = vi.fn();
			const unsubscribe = provider.onData(callback);

			provider.testNotifySubscribers({ value: 30 });
			expect(callback).toHaveBeenCalledTimes(1);

			unsubscribe();

			provider.testNotifySubscribers({ value: 40 });
			expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
		});

		it('should handle callback errors gracefully', () => {
			const goodCallback = vi.fn();
			const errorCallback = vi.fn(() => {
				throw new Error('Callback error');
			});
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			provider.onData(errorCallback);
			provider.onData(goodCallback);

			provider.testNotifySubscribers({ value: 50 });

			expect(errorCallback).toHaveBeenCalled();
			expect(goodCallback).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalled();

			consoleErrorSpy.mockRestore();
		});
	});

	describe('getConnectionStatus', () => {
		it('should return current status', () => {
			expect(provider.getConnectionStatus()).toBe('disconnected');

			provider.testSetStatus('connecting');
			expect(provider.getConnectionStatus()).toBe('connecting');

			provider.testSetStatus('connected');
			expect(provider.getConnectionStatus()).toBe('connected');

			provider.testSetStatus('error');
			expect(provider.getConnectionStatus()).toBe('error');
		});
	});

	describe('getLatency', () => {
		it('should return null initially', () => {
			expect(provider.getLatency()).toBeNull();
		});

		it('should return calculated latency', () => {
			const startTime = Date.now() - 100; // 100ms ago
			provider.testUpdateLatency(startTime);

			const latency = provider.getLatency();
			expect(latency).toBeGreaterThanOrEqual(100);
			expect(latency).toBeLessThan(110); // Allow some tolerance
		});
	});

	describe('getLastUpdate', () => {
		it('should return null initially', () => {
			expect(provider.getLastUpdate()).toBeNull();
		});

		it('should return timestamp of last notification', () => {
			const before = Date.now();
			provider.testNotifySubscribers({ value: 60 });
			const after = Date.now();

			const lastUpdate = provider.getLastUpdate();
			expect(lastUpdate).not.toBeNull();
			expect(lastUpdate!).toBeGreaterThanOrEqual(before);
			expect(lastUpdate!).toBeLessThanOrEqual(after);
		});

		it('should update on each notification', async () => {
			provider.testNotifySubscribers({ value: 70 });
			const firstUpdate = provider.getLastUpdate();

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 10));

			provider.testNotifySubscribers({ value: 80 });
			const secondUpdate = provider.getLastUpdate();

			expect(secondUpdate).toBeGreaterThan(firstUpdate!);
		});
	});

	describe('setStatus', () => {
		it('should update status', () => {
			provider.testSetStatus('connecting');
			expect(provider.getConnectionStatus()).toBe('connecting');
		});

		it('should set isCollecting when connected', () => {
			expect(provider.isCollecting).toBe(false);

			provider.testSetStatus('connected');
			expect(provider.isCollecting).toBe(true);
		});

		it('should unset isCollecting when not connected', () => {
			provider.testSetStatus('connected');
			expect(provider.isCollecting).toBe(true);

			provider.testSetStatus('disconnected');
			expect(provider.isCollecting).toBe(false);

			provider.testSetStatus('error');
			expect(provider.isCollecting).toBe(false);
		});
	});

	describe('notifySubscribers', () => {
		it('should update data', () => {
			const data = { value: 90 };
			provider.testNotifySubscribers(data);

			expect(provider.getData()).toEqual(data);
		});

		it('should update lastUpdate timestamp', () => {
			expect(provider.getLastUpdate()).toBeNull();

			provider.testNotifySubscribers({ value: 100 });

			expect(provider.getLastUpdate()).not.toBeNull();
		});

		it('should call all subscribers', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			const callback3 = vi.fn();

			provider.onData(callback1);
			provider.onData(callback2);
			provider.onData(callback3);

			const data = { value: 110 };
			provider.testNotifySubscribers(data);

			expect(callback1).toHaveBeenCalledWith(data);
			expect(callback2).toHaveBeenCalledWith(data);
			expect(callback3).toHaveBeenCalledWith(data);
		});
	});

	describe('logging', () => {
		it('should log with provider prefix', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			provider['log']('test message', 123);

			expect(consoleSpy).toHaveBeenCalledWith('[Test Provider]', 'test message', 123);

			consoleSpy.mockRestore();
		});

		it('should error log with provider prefix', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			provider['error']('error message', { code: 'ERR' });

			expect(consoleSpy).toHaveBeenCalledWith(
				'[Test Provider]',
				'error message',
				{ code: 'ERR' }
			);

			consoleSpy.mockRestore();
		});
	});

	describe('abstract method implementation', () => {
		it('should require connect implementation', async () => {
			await expect(provider.connect()).resolves.toBeUndefined();
			expect(provider.getConnectionStatus()).toBe('connected');
		});

		it('should require disconnect implementation', () => {
			provider.disconnect();
			expect(provider.getConnectionStatus()).toBe('disconnected');
		});
	});
});
