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

/**
 * Resource operations interface for generic handling (internal use only)
 */
interface ResourceOperations<T> {
    find: (name: string, namespace: string) => Result<T>
    add: (resource: T) => void
    delete: (name: string, namespace: string) => Result<T>
}

/**
 * Generic apply operation (create or update)
 */
export const applyResource = <T extends { kind: string; metadata: { name: string; namespace: string } }>(
    resource: T,
    ops: ResourceOperations<T>
): ExecutionResult => {
    const { name, namespace } = resource.metadata
    const existing = ops.find(name, namespace)

    if (existing.ok) {
        // Update: delete existing and add new (simulates apply behavior)
        const deleteResult = ops.delete(name, namespace)
        if (!deleteResult.ok) {
            return error(`Error: Failed to update ${resource.kind.toLowerCase()}: ${deleteResult.error}`)
        }
    }

    // Add resource (create or recreate)
    ops.add(resource)

    const action = existing.ok ? 'configured' : 'created'
    const kind = resource.kind.toLowerCase()
    return success(`${kind}/${name} ${action}`)
}

/**
 * Generic create operation (fails if exists)
 */
export const createResource = <T extends { kind: string; metadata: { name: string; namespace: string } }>(
    resource: T,
    ops: ResourceOperations<T>
): ExecutionResult => {
    const { name, namespace } = resource.metadata
    const existing = ops.find(name, namespace)

    if (existing.ok) {
        const kind = resource.kind.toLowerCase()
        return error(`Error from server (AlreadyExists): ${kind}s "${name}" already exists`)
    }

    ops.add(resource)
    const kind = resource.kind.toLowerCase()
    return success(`${kind}/${name} created`)
}

/**
 * Resource type configuration mapping
 */
type ResourceType = 'Pod' | 'ConfigMap' | 'Secret'

const RESOURCE_METHOD_MAPPING: Record<ResourceType, {
    find: keyof ClusterState
    add: keyof ClusterState
    delete: keyof ClusterState
}> = {
    Pod: { find: 'findPod', add: 'addPod', delete: 'deletePod' },
    ConfigMap: { find: 'findConfigMap', add: 'addConfigMap', delete: 'deleteConfigMap' },
    Secret: { find: 'findSecret', add: 'addSecret', delete: 'deleteSecret' }
}

/**
 * Create resource operations for a specific resource type
 */
export const createResourceOps = <T>(
    clusterState: ClusterState,
    resourceType: ResourceType
): ResourceOperations<T> => {
    const methods = RESOURCE_METHOD_MAPPING[resourceType]

    return {
        find: (name, namespace) => (clusterState[methods.find] as any)(name, namespace),
        add: (resource) => (clusterState[methods.add] as any)(resource),
        delete: (name, namespace) => (clusterState[methods.delete] as any)(name, namespace)
    }
}

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
        return error(`Error: Unknown resource kind: ${kind}`)
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
        return error(`Error: Unknown resource kind: ${kind}`)
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
