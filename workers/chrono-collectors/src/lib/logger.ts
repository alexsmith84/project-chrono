/**
 * Structured logging utility for Cloudflare Workers
 * Outputs JSON-formatted logs for easy parsing and monitoring
 */

import type { LogLevel, LogEntry } from '../types/index';

/**
 * Logger class for structured logging
 * Automatically includes worker ID and timestamp in all logs
 */
export class Logger {
  constructor(
    private workerId: string,
    private level: LogLevel = 'info'
  ) {}

  /**
   * Log a debug message (lowest priority)
   * Use for detailed debugging information
   */
  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  /**
   * Log an info message (normal priority)
   * Use for general operational information
   */
  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  /**
   * Log a warning message (elevated priority)
   * Use for recoverable errors or unusual situations
   */
  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  /**
   * Log an error message (highest priority)
   * Use for errors that require attention
   */
  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  /**
   * Internal log method that handles formatting and filtering
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    // Filter by log level
    if (!this.shouldLog(level)) {
      return;
    }

    // Create structured log entry
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      worker_id: this.workerId,
      message,
      ...(data !== undefined && { data })
    };

    // Output as JSON for easy parsing
    console.log(JSON.stringify(entry));
  }

  /**
   * Determine if a message at the given level should be logged
   * based on the configured minimum log level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[this.level];
  }

  /**
   * Update the minimum log level
   * Useful for dynamically changing verbosity
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }
}
