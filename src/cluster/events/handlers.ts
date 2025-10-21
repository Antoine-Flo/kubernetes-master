import type { ClusterStateData } from '../ClusterState'
import { addPod, deletePod, updatePod } from '../ClusterState'
import { createResourceRepository } from '../repositories/resourceRepository'
import type { ConfigMap } from '../ressources/ConfigMap'
import type { Secret } from '../ressources/Secret'
import type {
    ConfigMapCreatedEvent,
    ConfigMapDeletedEvent,
    ConfigMapUpdatedEvent,
    PodCreatedEvent,
    PodDeletedEvent,
    PodUpdatedEvent,
    SecretCreatedEvent,
    SecretDeletedEvent,
    SecretUpdatedEvent,
} from './types'

// ═══════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
// Pure functions that apply events to cluster state.
// Each handler takes current state + event and returns new state.
// These handlers are called by ClusterState when events are received.

// ─── Pod Event Handlers ──────────────────────────────────────────────────

/**
 * Handle PodCreated event
 * Pure function - returns new state
 */
export const handlePodCreated = (
    state: ClusterStateData,
    event: PodCreatedEvent
): ClusterStateData => {
    return addPod(state, event.payload.pod)
}

/**
 * Handle PodDeleted event
 * Pure function - returns new state
 */
export const handlePodDeleted = (
    state: ClusterStateData,
    event: PodDeletedEvent
): ClusterStateData => {
    const result = deletePod(state, event.payload.name, event.payload.namespace)
    if (result.ok && result.state) {
        return result.state
    }
    return state
}

/**
 * Handle PodUpdated event
 * Pure function - returns new state
 */
export const handlePodUpdated = (
    state: ClusterStateData,
    event: PodUpdatedEvent
): ClusterStateData => {
    const result = updatePod(
        state,
        event.payload.name,
        event.payload.namespace,
        () => event.payload.pod
    )
    if (result.ok && result.state) {
        return result.state
    }
    return state
}

// ─── ConfigMap Event Handlers ────────────────────────────────────────────

const configMapRepo = createResourceRepository<ConfigMap>('ConfigMap')

/**
 * Handle ConfigMapCreated event
 * Pure function - returns new state
 */
export const handleConfigMapCreated = (
    state: ClusterStateData,
    event: ConfigMapCreatedEvent
): ClusterStateData => {
    return {
        ...state,
        configMaps: configMapRepo.add(state.configMaps, event.payload.configMap),
    }
}

/**
 * Handle ConfigMapDeleted event
 * Pure function - returns new state
 */
export const handleConfigMapDeleted = (
    state: ClusterStateData,
    event: ConfigMapDeletedEvent
): ClusterStateData => {
    const result = configMapRepo.remove(
        state.configMaps,
        event.payload.name,
        event.payload.namespace
    )
    if (result.ok && result.collection) {
        return {
            ...state,
            configMaps: result.collection,
        }
    }
    return state
}

/**
 * Handle ConfigMapUpdated event
 * Pure function - returns new state
 */
export const handleConfigMapUpdated = (
    state: ClusterStateData,
    event: ConfigMapUpdatedEvent
): ClusterStateData => {
    const result = configMapRepo.update(
        state.configMaps,
        event.payload.name,
        event.payload.namespace,
        () => event.payload.configMap
    )
    if (result.ok && result.collection) {
        return {
            ...state,
            configMaps: result.collection,
        }
    }
    return state
}

// ─── Secret Event Handlers ───────────────────────────────────────────────

const secretRepo = createResourceRepository<Secret>('Secret')

/**
 * Handle SecretCreated event
 * Pure function - returns new state
 */
export const handleSecretCreated = (
    state: ClusterStateData,
    event: SecretCreatedEvent
): ClusterStateData => {
    return {
        ...state,
        secrets: secretRepo.add(state.secrets, event.payload.secret),
    }
}

/**
 * Handle SecretDeleted event
 * Pure function - returns new state
 */
export const handleSecretDeleted = (
    state: ClusterStateData,
    event: SecretDeletedEvent
): ClusterStateData => {
    const result = secretRepo.remove(
        state.secrets,
        event.payload.name,
        event.payload.namespace
    )
    if (result.ok && result.collection) {
        return {
            ...state,
            secrets: result.collection,
        }
    }
    return state
}

/**
 * Handle SecretUpdated event
 * Pure function - returns new state
 */
export const handleSecretUpdated = (
    state: ClusterStateData,
    event: SecretUpdatedEvent
): ClusterStateData => {
    const result = secretRepo.update(
        state.secrets,
        event.payload.name,
        event.payload.namespace,
        () => event.payload.secret
    )
    if (result.ok && result.collection) {
        return {
            ...state,
            secrets: result.collection,
        }
    }
    return state
}

