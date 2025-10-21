import type { EventFilter } from './EventBus'
import type { ClusterEvent, EventType } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// EVENT FILTERS
// ═══════════════════════════════════════════════════════════════════════════
// Helper functions for common event filtering patterns

/**
 * Filter events by namespace
 */
export const byNamespace = (namespace: string): EventFilter => (event: ClusterEvent) => {
    const payload = event.payload as any
    return payload.namespace === namespace || payload.pod?.metadata?.namespace === namespace ||
        payload.configMap?.metadata?.namespace === namespace || payload.secret?.metadata?.namespace === namespace
}

/**
 * Filter events by event types
 */
export const byTypes = (...types: EventType[]): EventFilter => (event: ClusterEvent) => {
    return types.includes(event.type)
}

/**
 * Filter events by source
 */
export const bySource = (source: string): EventFilter => (event: ClusterEvent) => {
    return event.metadata?.source === source
}

/**
 * Filter events by resource kind (Pod, ConfigMap, Secret)
 */
export const byResourceKind = (kind: 'Pod' | 'ConfigMap' | 'Secret'): EventFilter => (event: ClusterEvent) => {
    const kindPatterns = {
        Pod: /^Pod/,
        ConfigMap: /^ConfigMap/,
        Secret: /^Secret/,
    }
    return kindPatterns[kind].test(event.type)
}

/**
 * Combine multiple filters with AND logic
 */
export const and = (...filters: EventFilter[]): EventFilter => (event: ClusterEvent) => {
    return filters.every(filter => filter(event))
}

