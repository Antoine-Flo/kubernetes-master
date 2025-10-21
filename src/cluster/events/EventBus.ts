import type { ClusterEvent, EventSubscriber, EventType, UnsubscribeFn } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// EVENT BUS
// ═══════════════════════════════════════════════════════════════════════════
// Central event dispatcher using Observer pattern.
// Allows components to subscribe to specific event types or all events.
// Optionally stores event history for time-travel debugging (Phase 4).

export interface EventBus {
    emit: (event: ClusterEvent) => void
    subscribe: <T extends ClusterEvent>(eventType: EventType, subscriber: EventSubscriber<T>) => UnsubscribeFn
    subscribeAll: (subscriber: EventSubscriber) => UnsubscribeFn
    getHistory: () => readonly ClusterEvent[]
    clearHistory: () => void
}

interface EventBusOptions {
    enableHistory?: boolean
    maxHistorySize?: number
}

// ─── Pure Functions ──────────────────────────────────────────────────────

/**
 * Add event to history with FIFO rotation
 * Pure function
 */
const addToHistory = (
    history: ClusterEvent[],
    event: ClusterEvent,
    maxSize: number
): ClusterEvent[] => {
    const newHistory = [...history, event]
    if (newHistory.length > maxSize) {
        return newHistory.slice(1)
    }
    return newHistory
}

// ─── Factory ─────────────────────────────────────────────────────────────

/**
 * Create an EventBus instance
 * 
 * @param options - Configuration options
 * @returns EventBus instance with publish/subscribe API
 */
export const createEventBus = (options: EventBusOptions = {}): EventBus => {
    const enableHistory = options.enableHistory ?? true
    const maxHistorySize = options.maxHistorySize ?? 1000

    // Subscribers storage: Map<EventType, Set<Subscriber>>
    const subscribers = new Map<EventType, Set<EventSubscriber>>()
    const allSubscribers = new Set<EventSubscriber>()
    let eventHistory: ClusterEvent[] = []

    /**
     * Emit an event to all relevant subscribers
     */
    const emit = (event: ClusterEvent): void => {
        // Store in history if enabled
        if (enableHistory) {
            eventHistory = addToHistory(eventHistory, event, maxHistorySize)
        }

        // Notify type-specific subscribers
        const typeSubscribers = subscribers.get(event.type)
        if (typeSubscribers) {
            typeSubscribers.forEach(subscriber => {
                subscriber(event)
            })
        }

        // Notify all-events subscribers
        allSubscribers.forEach(subscriber => {
            subscriber(event)
        })
    }

    /**
     * Subscribe to a specific event type
     */
    const subscribe = <T extends ClusterEvent>(
        eventType: EventType,
        subscriber: EventSubscriber<T>
    ): UnsubscribeFn => {
        if (!subscribers.has(eventType)) {
            subscribers.set(eventType, new Set())
        }

        const typeSubscribers = subscribers.get(eventType)!
        typeSubscribers.add(subscriber as EventSubscriber)

        // Return unsubscribe function
        return () => {
            typeSubscribers.delete(subscriber as EventSubscriber)
            if (typeSubscribers.size === 0) {
                subscribers.delete(eventType)
            }
        }
    }

    /**
     * Subscribe to all events
     */
    const subscribeAll = (subscriber: EventSubscriber): UnsubscribeFn => {
        allSubscribers.add(subscriber)

        // Return unsubscribe function
        return () => {
            allSubscribers.delete(subscriber)
        }
    }

    /**
     * Get event history (read-only)
     */
    const getHistory = (): readonly ClusterEvent[] => {
        return [...eventHistory]
    }

    /**
     * Clear event history
     */
    const clearHistory = (): void => {
        eventHistory = []
    }

    return {
        emit,
        subscribe,
        subscribeAll,
        getHistory,
        clearHistory,
    }
}

