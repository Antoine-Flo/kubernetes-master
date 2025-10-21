// ═══════════════════════════════════════════════════════════════════════════
// CLUSTER EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════
// Type definitions for cluster events following Kubernetes event-driven model.
// Events represent state changes (CRUD operations) on cluster resources.

import type { ConfigMap } from '../ressources/ConfigMap'
import type { Pod } from '../ressources/Pod'
import type { Secret } from '../ressources/Secret'

// ─── Base Event Structure ────────────────────────────────────────────────

export interface BaseEvent {
    type: string
    timestamp: string
    metadata?: {
        source?: string
        correlationId?: string
        [key: string]: unknown
    }
}

// ─── Pod Events ──────────────────────────────────────────────────────────

export interface PodCreatedEvent extends BaseEvent {
    type: 'PodCreated'
    payload: {
        pod: Pod
    }
}

export interface PodDeletedEvent extends BaseEvent {
    type: 'PodDeleted'
    payload: {
        name: string
        namespace: string
        deletedPod: Pod
    }
}

export interface PodUpdatedEvent extends BaseEvent {
    type: 'PodUpdated'
    payload: {
        name: string
        namespace: string
        pod: Pod
        previousPod: Pod
    }
}

// ─── ConfigMap Events ────────────────────────────────────────────────────

export interface ConfigMapCreatedEvent extends BaseEvent {
    type: 'ConfigMapCreated'
    payload: {
        configMap: ConfigMap
    }
}

export interface ConfigMapDeletedEvent extends BaseEvent {
    type: 'ConfigMapDeleted'
    payload: {
        name: string
        namespace: string
        deletedConfigMap: ConfigMap
    }
}

export interface ConfigMapUpdatedEvent extends BaseEvent {
    type: 'ConfigMapUpdated'
    payload: {
        name: string
        namespace: string
        configMap: ConfigMap
        previousConfigMap: ConfigMap
    }
}

// ─── Secret Events ───────────────────────────────────────────────────────

export interface SecretCreatedEvent extends BaseEvent {
    type: 'SecretCreated'
    payload: {
        secret: Secret
    }
}

export interface SecretDeletedEvent extends BaseEvent {
    type: 'SecretDeleted'
    payload: {
        name: string
        namespace: string
        deletedSecret: Secret
    }
}

export interface SecretUpdatedEvent extends BaseEvent {
    type: 'SecretUpdated'
    payload: {
        name: string
        namespace: string
        secret: Secret
        previousSecret: Secret
    }
}

// ─── Event Union Type ────────────────────────────────────────────────────

export type ClusterEvent =
    | PodCreatedEvent
    | PodDeletedEvent
    | PodUpdatedEvent
    | ConfigMapCreatedEvent
    | ConfigMapDeletedEvent
    | ConfigMapUpdatedEvent
    | SecretCreatedEvent
    | SecretDeletedEvent
    | SecretUpdatedEvent

export type EventType = ClusterEvent['type']

// ─── Event Subscriber Types ──────────────────────────────────────────────

export type EventSubscriber<T extends ClusterEvent = ClusterEvent> = (event: T) => void
export type UnsubscribeFn = () => void

// ─── Event Factory Helpers ───────────────────────────────────────────────

/**
 * Create base event metadata
 * Pure function
 */
export const createEventMetadata = (source?: string): BaseEvent['metadata'] => ({
    source: source || 'cluster',
    correlationId: crypto.randomUUID(),
})

/**
 * Create timestamp for events
 * Pure function
 */
export const createEventTimestamp = (): string => new Date().toISOString()

// ─── Event Factory Functions ─────────────────────────────────────────────

/**
 * Create PodCreated event
 */
export const createPodCreatedEvent = (pod: Pod, source?: string): PodCreatedEvent => ({
    type: 'PodCreated',
    timestamp: createEventTimestamp(),
    metadata: createEventMetadata(source),
    payload: { pod },
})

/**
 * Create PodDeleted event
 */
export const createPodDeletedEvent = (
    name: string,
    namespace: string,
    deletedPod: Pod,
    source?: string
): PodDeletedEvent => ({
    type: 'PodDeleted',
    timestamp: createEventTimestamp(),
    metadata: createEventMetadata(source),
    payload: { name, namespace, deletedPod },
})

/**
 * Create PodUpdated event
 */
export const createPodUpdatedEvent = (
    name: string,
    namespace: string,
    pod: Pod,
    previousPod: Pod,
    source?: string
): PodUpdatedEvent => ({
    type: 'PodUpdated',
    timestamp: createEventTimestamp(),
    metadata: createEventMetadata(source),
    payload: { name, namespace, pod, previousPod },
})

/**
 * Create ConfigMapCreated event
 */
export const createConfigMapCreatedEvent = (configMap: ConfigMap, source?: string): ConfigMapCreatedEvent => ({
    type: 'ConfigMapCreated',
    timestamp: createEventTimestamp(),
    metadata: createEventMetadata(source),
    payload: { configMap },
})

/**
 * Create ConfigMapDeleted event
 */
export const createConfigMapDeletedEvent = (
    name: string,
    namespace: string,
    deletedConfigMap: ConfigMap,
    source?: string
): ConfigMapDeletedEvent => ({
    type: 'ConfigMapDeleted',
    timestamp: createEventTimestamp(),
    metadata: createEventMetadata(source),
    payload: { name, namespace, deletedConfigMap },
})

/**
 * Create ConfigMapUpdated event
 */
export const createConfigMapUpdatedEvent = (
    name: string,
    namespace: string,
    configMap: ConfigMap,
    previousConfigMap: ConfigMap,
    source?: string
): ConfigMapUpdatedEvent => ({
    type: 'ConfigMapUpdated',
    timestamp: createEventTimestamp(),
    metadata: createEventMetadata(source),
    payload: { name, namespace, configMap, previousConfigMap },
})

/**
 * Create SecretCreated event
 */
export const createSecretCreatedEvent = (secret: Secret, source?: string): SecretCreatedEvent => ({
    type: 'SecretCreated',
    timestamp: createEventTimestamp(),
    metadata: createEventMetadata(source),
    payload: { secret },
})

/**
 * Create SecretDeleted event
 */
export const createSecretDeletedEvent = (
    name: string,
    namespace: string,
    deletedSecret: Secret,
    source?: string
): SecretDeletedEvent => ({
    type: 'SecretDeleted',
    timestamp: createEventTimestamp(),
    metadata: createEventMetadata(source),
    payload: { name, namespace, deletedSecret },
})

/**
 * Create SecretUpdated event
 */
export const createSecretUpdatedEvent = (
    name: string,
    namespace: string,
    secret: Secret,
    previousSecret: Secret,
    source?: string
): SecretUpdatedEvent => ({
    type: 'SecretUpdated',
    timestamp: createEventTimestamp(),
    metadata: createEventMetadata(source),
    payload: { name, namespace, secret, previousSecret },
})

