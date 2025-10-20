import type { LogLevel, LogCategory, LogEntry, LogObserver } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// APPLICATION LOGGER
// ═══════════════════════════════════════════════════════════════════════════
// Event Sourcing: Log entries are immutable events appended to an event log.
// Observer Pattern: Subscribers get notified in real-time when events occur.
// 
// Features:
// - Immutable append-only event log
// - FIFO rotation (max 500 entries by default)
// - Real-time observer notifications
// - Optional console mirroring in dev mode
// - Filtering by level and category

export interface Logger {
    info(category: LogCategory, message: string): void
    warn(category: LogCategory, message: string): void
    error(category: LogCategory, message: string): void
    debug(category: LogCategory, message: string): void
    getEntries(filter?: { level?: LogLevel; category?: LogCategory }): LogEntry[]
    clear(): void
    subscribe(observer: LogObserver): () => void
}

interface LoggerOptions {
    maxEntries?: number
    mirrorToConsole?: boolean
}

// ─── Pure Functions ──────────────────────────────────────────────────────

/**
 * Create console mirroring observer
 * Pure function that returns an observer for console output
 */
const createConsoleObserver = (): LogObserver => {
    const consoleMap: Record<LogLevel, (msg: string) => void> = {
        error: console.error,
        warn: console.warn,
        debug: console.debug,
        info: console.log
    }

    return (entry: LogEntry) => {
        const prefix = `[${entry.level.toUpperCase()}] [${entry.category}]`
        const message = `${prefix} ${entry.message}`
        consoleMap[entry.level](message)
    }
}

/**
 * Filter entries by level and/or category
 * Pure function
 */
const matchesFilter = (entry: LogEntry, filter: { level?: LogLevel; category?: LogCategory }): boolean => {
    if (filter.level && entry.level !== filter.level) {
        return false
    }
    if (filter.category && entry.category !== filter.category) {
        return false
    }
    return true
}

/**
 * Create log entry
 * Pure function
 */
const createLogEntry = (level: LogLevel, category: LogCategory, message: string): LogEntry => ({
    timestamp: new Date().toISOString(),
    level,
    category,
    message
})

// ─── Factory ─────────────────────────────────────────────────────────────

/**
 * Create a logger instance with Event Sourcing + Observer Pattern
 * 
 * @param options - Configuration options
 * @returns Logger instance with public API
 */
export const createLogger = (options: LoggerOptions = {}): Logger => {
    const maxEntries = options.maxEntries ?? 500
    const observers: LogObserver[] = []
    let entries: LogEntry[] = []

    // Register console observer if enabled
    if (options.mirrorToConsole) {
        observers.push(createConsoleObserver())
    }

    // Append entry with FIFO rotation and observer notification
    const appendEntry = (level: LogLevel, category: LogCategory, message: string): void => {
        const entry = createLogEntry(level, category, message)
        entries = [...entries, entry]

        if (entries.length > maxEntries) {
            entries = entries.slice(1)
        }

        observers.forEach(observer => observer(entry))
    }

    // Create log methods dynamically to avoid repetition
    const logMethods = (['info', 'warn', 'error', 'debug'] as const).reduce((acc, level) => ({
        ...acc,
        [level]: (category: LogCategory, message: string) => appendEntry(level, category, message)
    }), {} as Record<LogLevel, (category: LogCategory, message: string) => void>)

    return {
        ...logMethods,

        getEntries: (filter?) => filter ? entries.filter(e => matchesFilter(e, filter)) : [...entries],

        clear: () => { entries = [] },

        subscribe: (observer) => {
            observers.push(observer)
            return () => {
                const index = observers.indexOf(observer)
                if (index > -1) observers.splice(index, 1)
            }
        }
    }
}
