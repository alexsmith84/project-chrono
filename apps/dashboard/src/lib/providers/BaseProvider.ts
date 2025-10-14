/**
 * Base Provider Class
 *
 * Abstract base class providing common functionality for all providers
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

	// State
	isActive: boolean = true;
	isCollecting: boolean = false;

	// Internal state
	protected status: ConnectionStatus = 'disconnected';
	protected latency: number | null = null;
	protected lastUpdate: number | null = null;
	protected data: T | null = null;
	protected callbacks: Array<(data: T) => void> = [];

	/**
	 * Abstract methods to be implemented by subclasses
	 */
	abstract connect(config?: ProviderConfig): Promise<void>;
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
	onData(callback: (data: T) => void): () => void {
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

		this.callbacks.forEach((callback) => {
			try {
				callback(data);
			} catch (error) {
				console.error(`Error in provider ${this.id} callback:`, error);
			}
		});
	}

	/**
	 * Update connection status
	 */
	protected setStatus(status: ConnectionStatus): void {
		this.status = status;
		this.isCollecting = status === 'connected';
	}

	/**
	 * Calculate and update latency
	 */
	protected updateLatency(startTime: number): void {
		this.latency = Date.now() - startTime;
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
