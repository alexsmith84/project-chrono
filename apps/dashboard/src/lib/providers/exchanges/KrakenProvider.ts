/**
 * Kraken Exchange Provider
 *
 * Connects to Project Chrono API WebSocket and filters Kraken price data
 */

import ReconnectingWebSocket from 'reconnecting-websocket';
import { BaseProvider } from '../BaseProvider';
import type { PriceData, ProviderConfig } from '../types';

export class KrakenProvider extends BaseProvider<PriceData> {
	readonly id = 'kraken';
	readonly name = 'Kraken';
	readonly category = 'exchange' as const;
	readonly dataType = 'price' as const;
	readonly color = '#5741D9';
	readonly icon = '/icons/kraken.svg';

	private ws: ReconnectingWebSocket | null = null;
	private subscribedSymbols: Set<string> = new Set();
	private priceCache: Map<string, PriceData> = new Map();
	private pingInterval: NodeJS.Timeout | null = null;

	async connect(config?: ProviderConfig): Promise<void> {
		const wsUrl = config?.wsUrl || 'ws://localhost:3000';

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

			if (message.exchange !== 'kraken') {
				return;
			}

			if (this.subscribedSymbols.size > 0 && !this.subscribedSymbols.has(message.symbol)) {
				return;
			}

			const priceData: PriceData = {
				symbol: message.symbol,
				price: message.price,
				timestamp: message.timestamp || Date.now(),
				exchange: 'kraken',
				volume: message.volume,
				bid: message.bid,
				ask: message.ask
			};

			this.priceCache.set(message.symbol, priceData);
			this.updateLatency(startTime);
			this.notifySubscribers(priceData);
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
