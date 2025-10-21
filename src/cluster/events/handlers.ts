import type { ClusterStateData } from '../ClusterState'
import { addPod, deletePod, updatePod } from '../ClusterState'
import { createResourceRepository } from '../repositories/resourceRepository'
import type { ConfigMap } from '../ressources/ConfigMap'
import type { Secret } from '../ressources/Secret'
import type {
    ConfigMapAnnotatedEvent,
    ConfigMapCreatedEvent,
    ConfigMapDeletedEvent,
    ConfigMapLabeledEvent,
    ConfigMapUpdatedEvent,
    PodAnnotatedEvent,
    PodCreatedEvent,
    PodDeletedEvent,
    PodLabeledEvent,
    PodUpdatedEvent,
    SecretAnnotatedEvent,
    SecretCreatedEvent,
    SecretDeletedEvent,
    SecretLabeledEvent,
    SecretUpdatedEvent,
} from './types'

// ═══════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
// Pure functions that apply events to cluster state.
// Each handler takes current state + event and returns new state.

// ─── Repositories ────────────────────────────────────────────────────────

const configMapRepo = createResourceRepository<ConfigMap>('ConfigMap')
const secretRepo = createResourceRepository<Secret>('Secret')

// ─── Generic Handler Factories ───────────────────────────────────────────

/**
 * Factory: Create handler for repository-based resources (ConfigMap, Secret)
 */
const createRepoHandler = <T>(
    repo: any,
    stateKey: 'configMaps' | 'secrets'
) => ({
    created: (state: ClusterStateData, resource: T) => ({
        ...state,
        [stateKey]: repo.add(state[stateKey] as any, resource),
    }),

    deleted: (state: ClusterStateData, name: string, namespace: string) => {
        const result = repo.remove(state[stateKey] as any, name, namespace)
        return result.ok && result.collection
            ? { ...state, [stateKey]: result.collection }
            : state
    },

    updated: (state: ClusterStateData, name: string, namespace: string, resource: T) => {
        const result = repo.update(state[stateKey] as any, name, namespace, () => resource)
        return result.ok && result.collection
            ? { ...state, [stateKey]: result.collection }
            : state
    },
})

/**
 * Factory: Create handler for Pod operations
 */
const createPodHandler = () => ({
    created: (state: ClusterStateData, pod: any) => addPod(state, pod),

    deleted: (state: ClusterStateData, name: string, namespace: string) => {
        const result = deletePod(state, name, namespace)
        return result.ok && result.state ? result.state : state
    },

    updated: (state: ClusterStateData, name: string, namespace: string, pod: any) => {
        const result = updatePod(state, name, namespace, () => pod)
        return result.ok && result.state ? result.state : state
    },
})

// ─── Handler Instances ───────────────────────────────────────────────────

const podHandler = createPodHandler()
const configMapHandler = createRepoHandler(configMapRepo, 'configMaps')
const secretHandler = createRepoHandler(secretRepo, 'secrets')

// ─── Pod Handlers ────────────────────────────────────────────────────────

export const handlePodCreated = (state: ClusterStateData, event: PodCreatedEvent) =>
    podHandler.created(state, event.payload.pod)

export const handlePodDeleted = (state: ClusterStateData, event: PodDeletedEvent) =>
    podHandler.deleted(state, event.payload.name, event.payload.namespace)

export const handlePodUpdated = (state: ClusterStateData, event: PodUpdatedEvent) =>
    podHandler.updated(state, event.payload.name, event.payload.namespace, event.payload.pod)

export const handlePodLabeled = (state: ClusterStateData, event: PodLabeledEvent) =>
    podHandler.updated(state, event.payload.name, event.payload.namespace, event.payload.pod)

export const handlePodAnnotated = (state: ClusterStateData, event: PodAnnotatedEvent) =>
    podHandler.updated(state, event.payload.name, event.payload.namespace, event.payload.pod)

// ─── ConfigMap Handlers ──────────────────────────────────────────────────

export const handleConfigMapCreated = (state: ClusterStateData, event: ConfigMapCreatedEvent) =>
    configMapHandler.created(state, event.payload.configMap)

export const handleConfigMapDeleted = (state: ClusterStateData, event: ConfigMapDeletedEvent) =>
    configMapHandler.deleted(state, event.payload.name, event.payload.namespace)

export const handleConfigMapUpdated = (state: ClusterStateData, event: ConfigMapUpdatedEvent) =>
    configMapHandler.updated(state, event.payload.name, event.payload.namespace, event.payload.configMap)

export const handleConfigMapLabeled = (state: ClusterStateData, event: ConfigMapLabeledEvent) =>
    configMapHandler.updated(state, event.payload.name, event.payload.namespace, event.payload.configMap)

export const handleConfigMapAnnotated = (state: ClusterStateData, event: ConfigMapAnnotatedEvent) =>
    configMapHandler.updated(state, event.payload.name, event.payload.namespace, event.payload.configMap)

// ─── Secret Handlers ─────────────────────────────────────────────────────

export const handleSecretCreated = (state: ClusterStateData, event: SecretCreatedEvent) =>
    secretHandler.created(state, event.payload.secret)

export const handleSecretDeleted = (state: ClusterStateData, event: SecretDeletedEvent) =>
    secretHandler.deleted(state, event.payload.name, event.payload.namespace)

export const handleSecretUpdated = (state: ClusterStateData, event: SecretUpdatedEvent) =>
    secretHandler.updated(state, event.payload.name, event.payload.namespace, event.payload.secret)

export const handleSecretLabeled = (state: ClusterStateData, event: SecretLabeledEvent) =>
    secretHandler.updated(state, event.payload.name, event.payload.namespace, event.payload.secret)

export const handleSecretAnnotated = (state: ClusterStateData, event: SecretAnnotatedEvent) =>
    secretHandler.updated(state, event.payload.name, event.payload.namespace, event.payload.secret)

