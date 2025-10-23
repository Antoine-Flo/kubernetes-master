// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE HELPERS
// ═══════════════════════════════════════════════════════════════════════════
// Generic functions for apply/create operations to avoid code duplication
// Now supports event-driven architecture with EventBus

import type { ClusterState } from '../../../cluster/ClusterState'
import type { EventBus } from '../../../cluster/events/EventBus'
import {
    createConfigMapCreatedEvent,
    createConfigMapUpdatedEvent,
    createPodCreatedEvent,
    createPodUpdatedEvent,
    createSecretCreatedEvent,
    createSecretUpdatedEvent,
} from '../../../cluster/events/types'
import type { ConfigMap } from '../../../cluster/ressources/ConfigMap'
import type { Pod } from '../../../cluster/ressources/Pod'
import type { Secret } from '../../../cluster/ressources/Secret'
import type { ExecutionResult, Result } from '../../../shared/result'
import { error, success } from '../../../shared/result'

// ─── Event-Driven Resource Operations ───────────────────────────────────

type KubernetesResource = Pod | ConfigMap | Secret

/**
 * Apply resource using event-driven architecture
 * Emits PodCreated/Updated, ConfigMapCreated/Updated, or SecretCreated/Updated events
 */
export const applyResourceWithEvents = (
    resource: KubernetesResource,
    clusterState: ClusterState,
    eventBus: EventBus
): ExecutionResult => {
    const { name, namespace } = resource.metadata
    const kind = resource.kind

    // Check if resource exists
    let existing: Result<any>
    if (kind === 'Pod') {
        existing = clusterState.findPod(name, namespace)
    } else if (kind === 'ConfigMap') {
        existing = clusterState.findConfigMap(name, namespace)
    } else if (kind === 'Secret') {
        existing = clusterState.findSecret(name, namespace)
    } else {
        return error(`error: the server doesn't have a resource type "${(kind as string).toLowerCase()}s"`)
    }

    // Emit appropriate event
    if (existing.ok) {
        // Update: emit updated event
        if (kind === 'Pod') {
            eventBus.emit(createPodUpdatedEvent(name, namespace, resource as Pod, existing.value, 'kubectl'))
        } else if (kind === 'ConfigMap') {
            eventBus.emit(createConfigMapUpdatedEvent(name, namespace, resource as ConfigMap, existing.value, 'kubectl'))
        } else if (kind === 'Secret') {
            eventBus.emit(createSecretUpdatedEvent(name, namespace, resource as Secret, existing.value, 'kubectl'))
        }
        return success(`${kind.toLowerCase()}/${name} configured`)
    } else {
        // Create: emit created event
        if (kind === 'Pod') {
            eventBus.emit(createPodCreatedEvent(resource as Pod, 'kubectl'))
        } else if (kind === 'ConfigMap') {
            eventBus.emit(createConfigMapCreatedEvent(resource as ConfigMap, 'kubectl'))
        } else if (kind === 'Secret') {
            eventBus.emit(createSecretCreatedEvent(resource as Secret, 'kubectl'))
        }
        return success(`${kind.toLowerCase()}/${name} created`)
    }
}

/**
 * Create resource using event-driven architecture
 * Emits PodCreated, ConfigMapCreated, or SecretCreated events
 * Fails if resource already exists
 */
export const createResourceWithEvents = (
    resource: KubernetesResource,
    clusterState: ClusterState,
    eventBus: EventBus
): ExecutionResult => {
    const { name, namespace } = resource.metadata
    const kind = resource.kind

    // Check if resource exists
    let existing: Result<any>
    if (kind === 'Pod') {
        existing = clusterState.findPod(name, namespace)
    } else if (kind === 'ConfigMap') {
        existing = clusterState.findConfigMap(name, namespace)
    } else if (kind === 'Secret') {
        existing = clusterState.findSecret(name, namespace)
    } else {
        return error(`error: the server doesn't have a resource type "${(kind as string).toLowerCase()}s"`)
    }

    if (existing.ok) {
        return error(`Error from server (AlreadyExists): ${kind.toLowerCase()}s "${name}" already exists`)
    }

    // Emit created event
    if (kind === 'Pod') {
        eventBus.emit(createPodCreatedEvent(resource as Pod, 'kubectl'))
    } else if (kind === 'ConfigMap') {
        eventBus.emit(createConfigMapCreatedEvent(resource as ConfigMap, 'kubectl'))
    } else if (kind === 'Secret') {
        eventBus.emit(createSecretCreatedEvent(resource as Secret, 'kubectl'))
    }

    return success(`${kind.toLowerCase()}/${name} created`)
}
