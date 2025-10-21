import type { Pod } from './ressources/Pod'
import type { ConfigMap } from './ressources/ConfigMap'
import type { Secret } from './ressources/Secret'
import type { Result } from '../shared/result'
import { createResourceRepository } from './repositories/resourceRepository'
import type { ResourceCollection, KubernetesResource } from './repositories/types'

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                    KUBERNETES CLUSTER STATE                           ║
// ╚═══════════════════════════════════════════════════════════════════════╝
// Manages virtual K8s cluster with pods, configmaps, secrets, and more.
// Uses Generic Repository Pattern for DRY CRUD operations.

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

// Export Pod operations for external use
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

// ─── Facade Helper ───────────────────────────────────────────────────

const createFacadeMethods = <T extends KubernetesResource>(
    ops: ResourceOperations<T>,
    getState: () => ClusterStateData,
    setState: (newState: ClusterStateData) => void
) => ({
    getAll: (namespace?: string) => ops.getAll(getState(), namespace),

    add: (resource: T) => {
        setState(ops.add(getState(), resource))
    },

    find: (name: string, namespace: string) => ops.find(getState(), name, namespace),

    delete: (name: string, namespace: string): Result<T> => {
        const result = ops.delete(getState(), name, namespace)
        if (result.ok && result.state) {
            setState(result.state)
            return { ok: true, value: result.value }
        }
        return result
    },

    update: (name: string, namespace: string, updateFn: (resource: T) => T): Result<T> => {
        const result = ops.update(getState(), name, namespace, updateFn)
        if (result.ok && result.state) {
            setState(result.state)
            return { ok: true, value: result.value }
        }
        return result
    },
})

// Facade factory function
export const createClusterState = (initialState?: ClusterStateData): ClusterState => {
    let state: ClusterStateData = initialState || createEmptyState()

    const getState = () => state
    const setState = (newState: ClusterStateData) => {
        state = newState
    }

    const podMethods = createFacadeMethods(podOps, getState, setState)
    const configMapMethods = createFacadeMethods(configMapOps, getState, setState)
    const secretMethods = createFacadeMethods(secretOps, getState, setState)

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
