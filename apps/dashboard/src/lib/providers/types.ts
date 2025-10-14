/**
 * Provider Types for Project Chrono Dashboard
 *
 * Multi-category plugin architecture for extensible data sources
 */

/**
 * Categories of data providers
 */
export type ProviderCategory =
	| 'exchange'    // Cryptocurrency exchanges (Coinbase, Binance, etc.)
	| 'sentiment'   // Social sentiment sources (Twitter, TikTok, Reddit)
	| 'index'       // Market indices (Fear & Greed, VIX)
	| 'commodity'   // Commodities (Gold, Oil, Wheat)
	| 'defi'        // DeFi protocols (Uniswap, Curve)
	| 'custom';     // User-defined sources

/**
 * Connection status for a provider
 */
export type ConnectionStatus =
	| 'connecting'
	| 'connected'
	| 'disconnected'
	| 'error';

/**
 * Type of data provided
 */
export type DataType =
	| 'price'       // Price data
	| 'sentiment'   // Sentiment scores
	| 'index'       // Index values
	| 'volume'      // Trading volume
	| 'custom';     // Custom data format

/**
 * Price data structure (for exchanges and commodities)
 */
export interface PriceData {
	symbol: string;
	price: number;
	timestamp: number;
	exchange: string;
	volume?: number;
	bid?: number;
	ask?: number;
}

/**
 * Sentiment data structure (for social media sources)
 */
export interface SentimentData {
	symbol: string;
	score: number;          // -1 to 1
	volume: number;         // Mentions/posts
	timestamp: number;
	source: string;
	breakdown?: {
		positive: number;
		negative: number;
		neutral: number;
	};
}

/**
 * Index data structure (for market indices)
 */
export interface IndexData {
	name: string;
	value: number;          // 0-100 or custom scale
	timestamp: number;
	classification?: string;
}

/**
 * Core data provider interface
 * All providers must implement this interface
 */
export interface DataProvider<T = any> {
	// Identity
	readonly id: string;
	readonly name: string;
	readonly category: ProviderCategory;
	readonly dataType: DataType;

	// Metadata
	readonly color: string;      // Brand color for UI
	readonly icon?: string;      // Optional icon path/URL

	// State
	isActive: boolean;           // Include in calculations?
	isCollecting: boolean;       // Currently collecting data?

	// Lifecycle hooks
	connect(config?: ProviderConfig): Promise<void>;
	disconnect(): void;

	// Data access
	getData(): T | null;
	onData(callback: (data: T) => void): () => void;  // Returns unsubscribe function

	// Status
	getConnectionStatus(): ConnectionStatus;
	getLatency(): number | null;                      // Milliseconds
	getLastUpdate(): number | null;                   // Timestamp

	// Subscriptions (for real-time sources)
	subscribe?(symbols: string[]): void;
	unsubscribe?(symbols: string[]): void;
}

/**
 * Configuration for provider initialization
 */
export interface ProviderConfig {
	wsUrl?: string;
	apiUrl?: string;
	apiKey?: string;
	symbols?: string[];
	[key: string]: any;  // Allow provider-specific config
}

/**
 * Provider metadata for UI display
 */
export interface ProviderMetadata {
	id: string;
	name: string;
	category: ProviderCategory;
	color: string;
	isActive: boolean;
	isCollecting: boolean;
	status: ConnectionStatus;
	latency: number | null;
	lastUpdate: number | null;
}
