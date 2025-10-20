// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE HELPERS
// ═══════════════════════════════════════════════════════════════════════════
// Generic functions for apply/create operations to avoid code duplication

import type { ClusterState } from '../../../cluster/ClusterState'
import type { ExecutionResult } from '../../../shared/result'
import { error, success } from '../../../shared/result'
import type { Result } from '../../../shared/result'

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
