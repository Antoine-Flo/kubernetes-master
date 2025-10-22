import type { Result } from '../shared/result'
import type { EventBus } from './events/EventBus'
import {
    handleConfigMapAnnotated,
    handleConfigMapCreated,
    handleConfigMapDeleted,
    handleConfigMapLabeled,
    handleConfigMapUpdated,
    handlePodAnnotated,
    handlePodCreated,
    handlePodDeleted,
    handlePodLabeled,
    handlePodUpdated,
    handleSecretAnnotated,
    handleSecretCreated,
    handleSecretDeleted,
    handleSecretLabeled,
    handleSecretUpdated,
} from './events/handlers'
import type { ClusterEvent } from './events/types'
import {
    createConfigMapCreatedEvent,
    createConfigMapDeletedEvent,
    createConfigMapUpdatedEvent,
    createPodCreatedEvent,
    createPodDeletedEvent,
    createPodUpdatedEvent,
    createSecretCreatedEvent,
    createSecretDeletedEvent,
    createSecretUpdatedEvent,
} from './events/types'
import { createResourceRepository } from './repositories/resourceRepository'
import type { KubernetesResource, ResourceCollection } from './repositories/types'
import type { ConfigMap } from './ressources/ConfigMap'
import type { Pod } from './ressources/Pod'
import type { Secret } from './ressources/Secret'

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                    KUBERNETES CLUSTER STATE                           ║
// ╚═══════════════════════════════════════════════════════════════════════╝
// Manages virtual K8s cluster with pods, configmaps, secrets, and more.
// Uses Generic Repository Pattern for DRY CRUD operations.
// Now supports event-driven architecture via EventBus subscription.

export interface ClusterStateData {
    pods: ResourceCollection<Pod>
    configMaps: ResourceCollection<ConfigMap>
    secrets: ResourceCollection<Secret>
}

// ─── Resource Repositories ───────────────────────────────────────────

// Create resource-specific repositories (singletons)
const podRepo = createResourceRepository<Pod>('Pod')
const configMapRepo = createResourceRepository<ConfigMap>('ConfigMap')
const secretRepo = createResourceRepository<Secret>('Secret')

// ─── Generic Resource Operations Helper ─────────────────────────────

type ResourceRepository<T extends KubernetesResource> = ReturnType<typeof createResourceRepository<T>>

interface ResourceOperations<T extends KubernetesResource> {
    add: (state: ClusterStateData, resource: T) => ClusterStateData
    getAll: (state: ClusterStateData, namespace?: string) => T[]
    find: (state: ClusterStateData, name: string, namespace: string) => Result<T>
    delete: (state: ClusterStateData, name: string, namespace: string) => Result<T> & { state?: ClusterStateData }
    update: (state: ClusterStateData, name: string, namespace: string, updateFn: (resource: T) => T) => Result<T> & { state?: ClusterStateData }
}

const createResourceOperations = <T extends KubernetesResource>(
    repo: ResourceRepository<T>,
    collectionKey: keyof ClusterStateData
): ResourceOperations<T> => ({
    add: (state: ClusterStateData, resource: T): ClusterStateData => ({
        ...state,
        [collectionKey]: repo.add(state[collectionKey] as unknown as ResourceCollection<T>, resource),
    }),

    getAll: (state: ClusterStateData, namespace?: string): T[] =>
        repo.getAll(state[collectionKey] as unknown as ResourceCollection<T>, namespace),

    find: (state: ClusterStateData, name: string, namespace: string): Result<T> =>
        repo.find(state[collectionKey] as unknown as ResourceCollection<T>, name, namespace),

    delete: (state: ClusterStateData, name: string, namespace: string): Result<T> & { state?: ClusterStateData } => {
        const result = repo.remove(state[collectionKey] as unknown as ResourceCollection<T>, name, namespace)
        if (result.ok && result.collection) {
            return {
                ok: true,
                value: result.value,
                state: { ...state, [collectionKey]: result.collection },
            }
        }
        return result
    },

    update: (state: ClusterStateData, name: string, namespace: string, updateFn: (resource: T) => T): Result<T> & { state?: ClusterStateData } => {
        const result = repo.update(state[collectionKey] as unknown as ResourceCollection<T>, name, namespace, updateFn)
        if (result.ok && result.collection) {
            return {
                ok: true,
                value: result.value,
                state: { ...state, [collectionKey]: result.collection },
            }
        }
        return result
    },
})

// ─── State Operations ────────────────────────────────────────────────

export const createEmptyState = (): ClusterStateData => ({
    pods: podRepo.createEmpty(),
    configMaps: configMapRepo.createEmpty(),
    secrets: secretRepo.createEmpty(),
})

// ─── Resource Operations (Generated) ─────────────────────────────────

const podOps = createResourceOperations<Pod>(podRepo, 'pods')
const configMapOps = createResourceOperations<ConfigMap>(configMapRepo, 'configMaps')
const secretOps = createResourceOperations<Secret>(secretRepo, 'secrets')

// Export Pod operations for test use only
export const addPod = podOps.add
export const getPods = podOps.getAll
export const findPod = podOps.find
export const deletePod = podOps.delete
export const updatePod = podOps.update

// Facade interface
export interface ClusterState {
    getPods: (namespace?: string) => Pod[]
    addPod: (pod: Pod) => void
    findPod: (name: string, namespace: string) => Result<Pod>
    deletePod: (name: string, namespace: string) => Result<Pod>
    updatePod: (name: string, namespace: string, updateFn: (pod: Pod) => Pod) => Result<Pod>
    getConfigMaps: (namespace?: string) => ConfigMap[]
    addConfigMap: (configMap: ConfigMap) => void
    findConfigMap: (name: string, namespace: string) => Result<ConfigMap>
    deleteConfigMap: (name: string, namespace: string) => Result<ConfigMap>
    updateConfigMap: (name: string, namespace: string, updateFn: (configMap: ConfigMap) => ConfigMap) => Result<ConfigMap>
    getSecrets: (namespace?: string) => Secret[]
    addSecret: (secret: Secret) => void
    findSecret: (name: string, namespace: string) => Result<Secret>
    deleteSecret: (name: string, namespace: string) => Result<Secret>
    updateSecret: (name: string, namespace: string, updateFn: (secret: Secret) => Secret) => Result<Secret>
    toJSON: () => ClusterStateData
    loadState: (state: ClusterStateData) => void
}

// ─── Event Factory Map ────────────────────────────────────────────────

const EVENT_FACTORIES = {
    Pod: {
        created: createPodCreatedEvent,
        deleted: createPodDeletedEvent,
        updated: createPodUpdatedEvent,
    },
    ConfigMap: {
        created: createConfigMapCreatedEvent,
        deleted: createConfigMapDeletedEvent,
        updated: createConfigMapUpdatedEvent,
    },
    Secret: {
        created: createSecretCreatedEvent,
        deleted: createSecretDeletedEvent,
        updated: createSecretUpdatedEvent,
    },
} as const

// ─── Facade Helper ───────────────────────────────────────────────────

const createFacadeMethods = <T extends KubernetesResource>(
    ops: ResourceOperations<T>,
    getState: () => ClusterStateData,
    _setState: (newState: ClusterStateData) => void,
    eventBus: EventBus,
    resourceKind: keyof typeof EVENT_FACTORIES
) => {
    const eventFactory = EVENT_FACTORIES[resourceKind]

    return {
        getAll: (namespace?: string) => ops.getAll(getState(), namespace),

        add: (resource: T) => {
            eventBus.emit(eventFactory.created(resource as any, 'direct'))
        },

        find: (name: string, namespace: string) => ops.find(getState(), name, namespace),

        delete: (name: string, namespace: string): Result<T> => {
            const findResult = ops.find(getState(), name, namespace)
            if (!findResult.ok) {
                return findResult
            }
            eventBus.emit(eventFactory.deleted(name, namespace, findResult.value as any, 'direct'))
            return { ok: true, value: findResult.value }
        },

        update: (name: string, namespace: string, updateFn: (resource: T) => T): Result<T> => {
            const findResult = ops.find(getState(), name, namespace)
            if (!findResult.ok) {
                return findResult
            }
            const updatedResource = updateFn(findResult.value)
            eventBus.emit(eventFactory.updated(name, namespace, updatedResource as any, findResult.value as any, 'direct'))
            return { ok: true, value: updatedResource }
        },
    }
}

// ─── Event Handling ──────────────────────────────────────────────────────

/**
 * Event handler map for dispatching events to handlers
 * Using object lookup pattern instead of switch
 */
const EVENT_HANDLERS: Record<string, (state: ClusterStateData, event: any) => ClusterStateData> = {
    PodCreated: handlePodCreated,
    PodDeleted: handlePodDeleted,
    PodUpdated: handlePodUpdated,
    ConfigMapCreated: handleConfigMapCreated,
    ConfigMapDeleted: handleConfigMapDeleted,
    ConfigMapUpdated: handleConfigMapUpdated,
    SecretCreated: handleSecretCreated,
    SecretDeleted: handleSecretDeleted,
    SecretUpdated: handleSecretUpdated,
    PodLabeled: handlePodLabeled,
    ConfigMapLabeled: handleConfigMapLabeled,
    SecretLabeled: handleSecretLabeled,
    PodAnnotated: handlePodAnnotated,
    ConfigMapAnnotated: handleConfigMapAnnotated,
    SecretAnnotated: handleSecretAnnotated,
}

/**
 * Apply event to cluster state
 * Dispatches to appropriate handler based on event type
 */
const applyEventToState = (state: ClusterStateData, event: ClusterEvent): ClusterStateData => {
    const handler = EVENT_HANDLERS[event.type]
    if (!handler) {
        return state
    }
    return handler(state, event)
}

// Facade factory function
export function createClusterState(eventBus: EventBus): ClusterState
export function createClusterState(initialState: ClusterStateData, eventBus: EventBus): ClusterState
export function createClusterState(
    initialStateOrEventBus: ClusterStateData | EventBus,
    eventBus?: EventBus
): ClusterState {
    const [initialState, bus] = eventBus 
        ? [initialStateOrEventBus as ClusterStateData, eventBus]
        : [undefined, initialStateOrEventBus as EventBus]
    
    let state: ClusterStateData = initialState || createEmptyState()

    const getState = () => state
    const setState = (newState: ClusterStateData) => {
        state = newState
    }

    // Subscribe to all events for state updates
    bus.subscribeAll((event) => {
        state = applyEventToState(state, event)
    })

    const podMethods = createFacadeMethods(podOps, getState, setState, bus, 'Pod')
    const configMapMethods = createFacadeMethods(configMapOps, getState, setState, bus, 'ConfigMap')
    const secretMethods = createFacadeMethods(secretOps, getState, setState, bus, 'Secret')

    return {
        getPods: podMethods.getAll,
        addPod: podMethods.add,
        findPod: podMethods.find,
        deletePod: podMethods.delete,
        updatePod: podMethods.update,

        getConfigMaps: configMapMethods.getAll,
        addConfigMap: configMapMethods.add,
        findConfigMap: configMapMethods.find,
        deleteConfigMap: configMapMethods.delete,
        updateConfigMap: configMapMethods.update,

        getSecrets: secretMethods.getAll,
        addSecret: secretMethods.add,
        findSecret: secretMethods.find,
        deleteSecret: secretMethods.delete,
        updateSecret: secretMethods.update,

        toJSON: () => ({
            pods: { items: [...state.pods.items] },
            configMaps: { items: [...state.configMaps.items] },
            secrets: { items: [...state.secrets.items] },
        }),

        loadState: (newState: ClusterStateData) => {
            state = newState
        },
    }
}
