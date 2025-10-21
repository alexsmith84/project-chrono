/**
 * Binance Exchange Provider
 *
 * Connects to Project Chrono API WebSocket and filters Binance price data
 */

import ReconnectingWebSocket from 'reconnecting-websocket';
import { BaseProvider } from '../BaseProvider.svelte.ts';
import type { PriceData, ProviderConfig } from '../types';

export class BinanceProvider extends BaseProvider<PriceData> {
	readonly id = 'binance';
	readonly name = 'Binance';
	readonly category = 'exchange' as const;
	readonly dataType = 'price' as const;
	readonly color = '#F3BA2F';
	readonly icon = '/icons/binance.svg';

	private ws: ReconnectingWebSocket | null = null;
	private subscribedSymbols: Set<string> = new Set();
	private priceCache: Map<string, PriceData> = new Map();
	private pingInterval: NodeJS.Timeout | null = null;

	async connect(config?: ProviderConfig): Promise<void> {
		const wsUrl = config?.wsUrl || 'ws://localhost:3000/stream';

		this.log('Connecting to', wsUrl);
		this.setStatus('connecting');

		try {
			this.ws = new ReconnectingWebSocket(wsUrl, [], {
				maxRetries: 10,
				connectionTimeout: 5000,
				maxReconnectionDelay: 10000,
				minReconnectionDelay: 1000
			});

			this.setupEventHandlers();
			await this.waitForConnection();

			if (config?.symbols && config.symbols.length > 0) {
				this.subscribe(config.symbols);
			}

			this.log('✅ Connected');
		} catch (error) {
			this.error('Connection failed:', error);
			this.setStatus('error');
			throw error;
		}
	}

	disconnect(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.setStatus('disconnected');
		this.subscribedSymbols.clear();
		this.priceCache.clear();
		this.log('Disconnected');
	}

	subscribe(symbols: string[]): void {
		symbols.forEach((symbol) => this.subscribedSymbols.add(symbol));
		this.log('Subscribed to:', Array.from(this.subscribedSymbols));
	}

	unsubscribe(symbols: string[]): void {
		symbols.forEach((symbol) => this.subscribedSymbols.delete(symbol));
		this.log('Unsubscribed from:', symbols);
	}

	getPriceForSymbol(symbol: string): PriceData | null {
		return this.priceCache.get(symbol) || null;
	}

	getAllPrices(): Map<string, PriceData> {
		return new Map(this.priceCache);
	}

	private setupEventHandlers(): void {
		if (!this.ws) return;

		this.ws.onopen = () => {
			this.setStatus('connected');
			this.log('WebSocket opened');
			this.startPingMonitoring();
		};

		this.ws.onmessage = (event) => {
			this.handleMessage(event.data);
		};

		this.ws.onerror = (error) => {
			this.error('WebSocket error:', error);
			this.setStatus('error');
		};

		this.ws.onclose = () => {
			this.setStatus('disconnected');
			this.log('WebSocket closed');

			if (this.pingInterval) {
				clearInterval(this.pingInterval);
				this.pingInterval = null;
			}
		};
	}

	private handleMessage(data: string): void {
		const startTime = Date.now();

		try {
			const message = JSON.parse(data);

			if (message.type === 'price_update' && message.data) {
				const { data: priceUpdate } = message;

				if (priceUpdate.source !== 'binance') {
					return;
				}

				if (this.subscribedSymbols.size > 0 && !this.subscribedSymbols.has(priceUpdate.symbol)) {
					return;
				}

				const priceData: PriceData = {
					symbol: priceUpdate.symbol,
					price: priceUpdate.price,
					timestamp: priceUpdate.timestamp ? new Date(priceUpdate.timestamp).getTime() : Date.now(),
					exchange: 'binance',
					volume: priceUpdate.volume,
					bid: priceUpdate.metadata?.bid,
					ask: priceUpdate.metadata?.ask
				};

				this.priceCache.set(priceUpdate.symbol, priceData);
				this.updateLatency(startTime);
				this.notifySubscribers(priceData);
				this.log('📊 Received price update:', priceUpdate.symbol, priceUpdate.price);
			} else if (message.type === 'subscribed') {
				this.log('✅ Server confirmed subscription:', message.symbols);
			} else if (message.type === 'pong') {
				// Heartbeat response
			} else if (message.type === 'error') {
				this.error('Server error:', message.message);
			}
		} catch (error) {
			this.error('Failed to parse message:', error);
		}
	}

	private waitForConnection(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.ws) {
				reject(new Error('WebSocket not initialized'));
				return;
			}

			const timeout = setTimeout(() => {
				reject(new Error('Connection timeout'));
			}, 10000);

			const checkConnection = () => {
				if (!this.ws) {
					clearTimeout(timeout);
					reject(new Error('WebSocket closed before connection'));
					return;
				}

				if (this.ws.readyState === WebSocket.OPEN) {
					clearTimeout(timeout);
					resolve();
				} else if (this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
					clearTimeout(timeout);
					reject(new Error('WebSocket closed'));
				} else {
					setTimeout(checkConnection, 100);
				}
			};

			checkConnection();
		});
	}

	private startPingMonitoring(): void {
		this.pingInterval = setInterval(() => {
			if (this.lastUpdate && Date.now() - this.lastUpdate > 30000) {
				this.log('⚠️ No data received in 30 seconds');
			}
		}, 10000);
	}
}
