/**
 * Base Provider Class
 *
 * Abstract base class providing common functionality for all providers
 *
 * Note: This is a .svelte.ts file to enable Svelte 5 runes ($state, etc.)
 * Runes are available globally in .svelte.ts files - no import needed
 */

import type {
	DataProvider,
	ProviderCategory,
	DataType,
	ConnectionStatus,
	ProviderConfig
} from './types';

export abstract class BaseProvider<T = any> implements DataProvider<T> {
	// Required by interface
	abstract readonly id: string;
	abstract readonly name: string;
	abstract readonly category: ProviderCategory;
	abstract readonly dataType: DataType;
	abstract readonly color: string;
	readonly icon?: string;

	// Reactive state - Svelte 5 runes
	isActive = $state(true);
	isCollecting = $state(false);
	status = $state<ConnectionStatus>('disconnected');
	latency = $state<number | null>(null);
	lastUpdate = $state<number | null>(null);

	// Internal reactive state
	protected data = $state<T | null>(null);
	protected callbacks: Array<(_data: T) => void> = [];

	// Registry callback for triggering UI updates (now optional since state is reactive)
	private stateChangeCallback: (() => void) | null = null;

	/**
	 * Set state change callback (called by registry)
	 */
	setStateChangeCallback(callback: () => void): void {
		this.stateChangeCallback = callback;
	}

	/**
	 * Abstract methods to be implemented by subclasses
	 */
	abstract connect(_config?: ProviderConfig): Promise<void>;
	abstract disconnect(): void;

	/**
	 * Get current data
	 */
	getData(): T | null {
		return this.data;
	}

	/**
	 * Subscribe to data updates
	 */
	onData(callback: (_data: T) => void): () => void {
		this.callbacks.push(callback);

		// Return unsubscribe function
		return () => {
			const index = this.callbacks.indexOf(callback);
			if (index > -1) {
				this.callbacks.splice(index, 1);
			}
		};
	}

	/**
	 * Get connection status
	 */
	getConnectionStatus(): ConnectionStatus {
		return this.status;
	}

	/**
	 * Get latency in milliseconds
	 */
	getLatency(): number | null {
		return this.latency;
	}

	/**
	 * Get last update timestamp
	 */
	getLastUpdate(): number | null {
		return this.lastUpdate;
	}

	/**
	 * Notify all subscribers of new data
	 */
	protected notifySubscribers(data: T): void {
		this.data = data;
		this.lastUpdate = Date.now();

		console.log(`[${this.name}] BaseProvider notifySubscribers - callbacks:`, this.callbacks.length, 'lastUpdate:', this.lastUpdate);

		this.callbacks.forEach((callback, index) => {
			try {
				console.log(`[${this.name}] Calling callback #${index}`);
				callback(data);
				console.log(`[${this.name}] Callback #${index} completed`);
			} catch (error) {
				console.error(`Error in provider ${this.id} callback:`, error);
			}
		});

		// Trigger UI update
		console.log(`[${this.name}] Triggering state change notification`);
		this.notifyStateChange();
	}

	/**
	 * Update connection status
	 */
	protected setStatus(status: ConnectionStatus): void {
		this.status = status;
		this.isCollecting = status === 'connected';
		this.notifyStateChange();
	}

	/**
	 * Calculate and update latency
	 */
	protected updateLatency(startTime: number): void {
		const newLatency = Date.now() - startTime;
		// Ensure minimum latency of 1ms for display purposes (0ms means < 1ms)
		this.latency = newLatency === 0 ? 1 : newLatency;
		this.notifyStateChange();
	}

	/**
	 * Notify registry of state change for UI updates
	 */
	private notifyStateChange(): void {
		if (this.stateChangeCallback) {
			this.stateChangeCallback();
		}
	}

	/**
	 * Log with provider prefix
	 */
	protected log(message: string, ...args: any[]): void {
		console.log(`[${this.name}]`, message, ...args);
	}

	/**
	 * Log error with provider prefix
	 */
	protected error(message: string, ...args: any[]): void {
		console.error(`[${this.name}]`, message, ...args);
	}
}
