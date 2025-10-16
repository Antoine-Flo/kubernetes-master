// ═══════════════════════════════════════════════════════════════════════════
// LOGGER TYPES
// ═══════════════════════════════════════════════════════════════════════════
// Type definitions for application logging system.
// Uses Event Sourcing pattern - log entries are immutable events.

/**
 * Log severity levels
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

/**
 * Categories for organizing logs by system component
 */
export type LogCategory = 'COMMAND' | 'EXECUTOR' | 'FILESYSTEM' | 'CLUSTER'

/**
 * Log entry - immutable event in the log stream
 * Follows Event Sourcing pattern
 */
export interface LogEntry {
    timestamp: string
    level: LogLevel
    category: LogCategory
    message: string
}

/**
 * Observer function type for subscribing to log events
 * Part of Observer Pattern implementation
 */
export type LogObserver = (entry: LogEntry) => void

