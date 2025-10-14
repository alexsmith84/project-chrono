/**
 * Price feed batching utility
 * Accumulates price feeds and flushes them based on time or count thresholds
 */

import type { PriceFeed, WorkerConfig } from '../types/index';
import { Logger } from './logger';

/**
 * Batch manager for price feeds
 * Flushes when either:
 * - Time threshold is reached (e.g., every 5 seconds)
 * - Count threshold is reached (e.g., 100 feeds)
 */
export class PriceBatcher {
  private batch: PriceFeed[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private feedsCollected = 0;
  private batchesSent = 0;

  constructor(
    private config: WorkerConfig,
    private logger: Logger,
    private onFlush: (feeds: PriceFeed[]) => Promise<void>
  ) {}

  /**
   * Add a price feed to the current batch
   * Automatically triggers flush if count threshold is reached
   */
  add(feed: PriceFeed): void {
    this.batch.push(feed);
    this.feedsCollected++;

    // Start timer if not already running
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush().catch(error => {
          this.logger.error('Timer-based flush failed', { error: String(error) });
        });
      }, this.config.batchIntervalMs);
    }

    // Flush immediately if we've hit the count threshold
    if (this.batch.length >= this.config.batchSize) {
      this.flush().catch(error => {
        this.logger.error('Count-based flush failed', { error: String(error) });
      });
    }
  }

  /**
   * Flush the current batch immediately
   * Clears the batch and timer after flushing
   */
  async flush(): Promise<void> {
    // Nothing to flush
    if (this.batch.length === 0) {
      return;
    }

    // Capture current batch and reset
    const feeds = [...this.batch];
    this.batch = [];

    // Clear timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Log the flush
    this.logger.debug('Flushing batch', {
      feed_count: feeds.length,
      symbols: [...new Set(feeds.map(f => f.symbol))]
    });

    try {
      // Call the flush handler with retry logic
      await this.flushWithRetry(feeds);
      this.batchesSent++;

      this.logger.info('Batch ingested successfully', {
        feed_count: feeds.length,
        batches_sent: this.batchesSent,
        feeds_collected: this.feedsCollected
      });
    } catch (error) {
      this.logger.error('Failed to ingest batch after retries', {
        error: String(error),
        feed_count: feeds.length
      });

      // Re-add failed feeds to the batch for next attempt
      // Only keep the most recent feeds to avoid memory issues
      const maxRetainedFeeds = this.config.batchSize * 2;
      if (feeds.length <= maxRetainedFeeds) {
        this.batch.unshift(...feeds);
      }
    }
  }

  /**
   * Flush with exponential backoff retry logic
   * Retries up to 3 times with increasing delays
   */
  private async flushWithRetry(feeds: PriceFeed[]): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await this.onFlush(feeds);
        return; // Success!
      } catch (error) {
        attempt++;

        if (attempt >= maxRetries) {
          throw error; // Give up after max retries
        }

        // Exponential backoff: 1s, 2s, 4s
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        this.logger.warn('Flush attempt failed, retrying', {
          attempt,
          max_retries: maxRetries,
          delay_ms: delayMs,
          error: String(error)
        });

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Get statistics about batching
   */
  getStats() {
    return {
      current_batch_size: this.batch.length,
      feeds_collected: this.feedsCollected,
      batches_sent: this.batchesSent
    };
  }

  /**
   * Force flush on shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down batcher, flushing remaining feeds');
    await this.flush();
  }
}
