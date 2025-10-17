// ═══════════════════════════════════════════════════════════════════════════
// GENERIC RESOURCE REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════
// Generic CRUD operations for any Kubernetes resource type

import type { Result } from '../../shared/result'
import type { KubernetesResource, ResourceCollection } from './types'

// Create empty collection
export const createEmptyCollection = <T extends KubernetesResource>(): ResourceCollection<T> => ({
    items: [],
})

// Add resource to collection
export const add = <T extends KubernetesResource>(
    collection: ResourceCollection<T>,
    resource: T
): ResourceCollection<T> => ({
    items: [...collection.items, resource],
})

// Get all resources (optionally filtered by namespace)
export const getAll = <T extends KubernetesResource>(
    collection: ResourceCollection<T>,
    namespace?: string
): T[] => {
    if (!namespace) {
        return [...collection.items]
    }
    return collection.items.filter((item) => item.metadata.namespace === namespace)
}

// Find single resource by name and namespace
export const find = <T extends KubernetesResource>(
    collection: ResourceCollection<T>,
    name: string,
    namespace: string,
    kind: string
): Result<T> => {
    const item = collection.items.find(
        (r) => r.metadata.name === name && r.metadata.namespace === namespace
    )

    if (!item) {
        return {
            type: 'error',
            message: `${kind} "${name}" not found in namespace "${namespace}"`,
        }
    }

    return { type: 'success', data: item }
}

// Remove resource by name and namespace
export const remove = <T extends KubernetesResource>(
    collection: ResourceCollection<T>,
    name: string,
    namespace: string,
    kind: string
): Result<T> & { collection?: ResourceCollection<T> } => {
    const index = collection.items.findIndex(
        (r) => r.metadata.name === name && r.metadata.namespace === namespace
    )

    if (index === -1) {
        return {
            type: 'error',
            message: `${kind} "${name}" not found in namespace "${namespace}"`,
        }
    }

    const deleted = collection.items[index]
    const newItems = [...collection.items.slice(0, index), ...collection.items.slice(index + 1)]

    return {
        type: 'success',
        data: deleted,
        collection: { items: newItems },
    }
}

// Create resource-specific repository with bound kind
export const createResourceRepository = <T extends KubernetesResource>(kind: string) => {
    return {
        createEmpty: () => createEmptyCollection<T>(),
        add: (collection: ResourceCollection<T>, resource: T) => add(collection, resource),
        getAll: (collection: ResourceCollection<T>, namespace?: string) =>
            getAll(collection, namespace),
        find: (collection: ResourceCollection<T>, name: string, namespace: string) =>
            find(collection, name, namespace, kind),
        remove: (collection: ResourceCollection<T>, name: string, namespace: string) =>
            remove(collection, name, namespace, kind),
    }
}

