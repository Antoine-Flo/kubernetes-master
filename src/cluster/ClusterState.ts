import type { Pod } from './ressources/Pod'
import type { ConfigMap } from './ressources/ConfigMap'
import type { Secret } from './ressources/Secret'
import type { Result } from '../shared/result'
import { createResourceRepository } from './repositories/resourceRepository'
import type { ResourceCollection } from './repositories/types'

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

// ─── State Operations ────────────────────────────────────────────────

export const createEmptyState = (): ClusterStateData => ({
    pods: podRepo.createEmpty(),
    configMaps: configMapRepo.createEmpty(),
    secrets: secretRepo.createEmpty(),
})

// ─── Pod Operations ──────────────────────────────────────────────────

export const addPod = (state: ClusterStateData, pod: Pod): ClusterStateData => ({
    ...state,
    pods: podRepo.add(state.pods, pod),
})

export const getPods = (state: ClusterStateData, namespace?: string): Pod[] =>
    podRepo.getAll(state.pods, namespace)

export const findPod = (
    state: ClusterStateData,
    name: string,
    namespace: string
): Result<Pod> => podRepo.find(state.pods, name, namespace)

export const deletePod = (
    state: ClusterStateData,
    name: string,
    namespace: string
): Result<Pod> & { state?: ClusterStateData } => {
    const result = podRepo.remove(state.pods, name, namespace)
    if (result.ok && result.collection) {
        return {
            ok: true,
            value: result.value,
            state: { ...state, pods: result.collection },
        }
    }
    return result
}

// ─── ConfigMap Operations ────────────────────────────────────────────

const addConfigMap = (state: ClusterStateData, configMap: ConfigMap): ClusterStateData => ({
    ...state,
    configMaps: configMapRepo.add(state.configMaps, configMap),
})

const getConfigMaps = (state: ClusterStateData, namespace?: string): ConfigMap[] =>
    configMapRepo.getAll(state.configMaps, namespace)

const findConfigMap = (
    state: ClusterStateData,
    name: string,
    namespace: string
): Result<ConfigMap> => configMapRepo.find(state.configMaps, name, namespace)

const deleteConfigMap = (
    state: ClusterStateData,
    name: string,
    namespace: string
): Result<ConfigMap> & { state?: ClusterStateData } => {
    const result = configMapRepo.remove(state.configMaps, name, namespace)
    if (result.ok && result.collection) {
        return {
            ok: true,
            value: result.value,
            state: { ...state, configMaps: result.collection },
        }
    }
    return result
}

// ─── Secret Operations ───────────────────────────────────────────────

const addSecret = (state: ClusterStateData, secret: Secret): ClusterStateData => ({
    ...state,
    secrets: secretRepo.add(state.secrets, secret),
})

const getSecrets = (state: ClusterStateData, namespace?: string): Secret[] =>
    secretRepo.getAll(state.secrets, namespace)

const findSecret = (
    state: ClusterStateData,
    name: string,
    namespace: string
): Result<Secret> => secretRepo.find(state.secrets, name, namespace)

const deleteSecret = (
    state: ClusterStateData,
    name: string,
    namespace: string
): Result<Secret> & { state?: ClusterStateData } => {
    const result = secretRepo.remove(state.secrets, name, namespace)
    if (result.ok && result.collection) {
        return {
            ok: true,
            value: result.value,
            state: { ...state, secrets: result.collection },
        }
    }
    return result
}

// Facade interface
export interface ClusterState {
    getPods: (namespace?: string) => Pod[]
    addPod: (pod: Pod) => void
    findPod: (name: string, namespace: string) => Result<Pod>
    deletePod: (name: string, namespace: string) => Result<Pod>
    getConfigMaps: (namespace?: string) => ConfigMap[]
    addConfigMap: (configMap: ConfigMap) => void
    findConfigMap: (name: string, namespace: string) => Result<ConfigMap>
    deleteConfigMap: (name: string, namespace: string) => Result<ConfigMap>
    getSecrets: (namespace?: string) => Secret[]
    addSecret: (secret: Secret) => void
    findSecret: (name: string, namespace: string) => Result<Secret>
    deleteSecret: (name: string, namespace: string) => Result<Secret>
    toJSON: () => ClusterStateData
    loadState: (state: ClusterStateData) => void
}

// Facade factory function
export const createClusterState = (initialState?: ClusterStateData): ClusterState => {
    let state: ClusterStateData = initialState || createEmptyState()

    return {
        getPods: (namespace?: string) => getPods(state, namespace),

        addPod: (pod: Pod) => {
            state = addPod(state, pod)
        },

        findPod: (name: string, namespace: string) => findPod(state, name, namespace),

        deletePod: (name: string, namespace: string): Result<Pod> => {
            const result = deletePod(state, name, namespace)
            if (result.ok && result.state) {
                state = result.state
            }
            return result.ok && result.state
                ? { ok: true, value: result.value }
                : result
        },

        getConfigMaps: (namespace?: string) => getConfigMaps(state, namespace),

        addConfigMap: (configMap: ConfigMap) => {
            state = addConfigMap(state, configMap)
        },

        findConfigMap: (name: string, namespace: string) => findConfigMap(state, name, namespace),

        deleteConfigMap: (name: string, namespace: string): Result<ConfigMap> => {
            const result = deleteConfigMap(state, name, namespace)
            if (result.ok && result.state) {
                state = result.state
            }
            return result.ok && result.state
                ? { ok: true, value: result.value }
                : result
        },

        getSecrets: (namespace?: string) => getSecrets(state, namespace),

        addSecret: (secret: Secret) => {
            state = addSecret(state, secret)
        },

        findSecret: (name: string, namespace: string) => findSecret(state, name, namespace),

        deleteSecret: (name: string, namespace: string): Result<Secret> => {
            const result = deleteSecret(state, name, namespace)
            if (result.ok && result.state) {
                state = result.state
            }
            return result.ok && result.state
                ? { ok: true, value: result.value }
                : result
        },

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

