import type { Pod } from './models/Pod'
import type { Result } from '../shared/result'

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                    KUBERNETES CLUSTER STATE                           ║
// ╚═══════════════════════════════════════════════════════════════════════╝
// Manages virtual K8s cluster with pods, deployments, and services.

export interface ClusterStateData {
    pods: Pod[]
}

// Result types for operations
export type DeleteResult =
    | { type: 'success'; data: Pod; state: ClusterStateData }
    | { type: 'error'; message: string }

// Pure functions for state operations

export const createEmptyState = (): ClusterStateData => ({
    pods: [],
})

export const addPod = (state: ClusterStateData, pod: Pod): ClusterStateData => ({
    ...state,
    pods: [...state.pods, pod],
})

export const getPods = (state: ClusterStateData, namespace?: string): Pod[] => {
    if (!namespace) {
        return [...state.pods]
    }
    return state.pods.filter((pod) => pod.metadata.namespace === namespace)
}

export const findPod = (
    state: ClusterStateData,
    name: string,
    namespace: string
): Result<Pod> => {
    const pod = state.pods.find(
        (p) => p.metadata.name === name && p.metadata.namespace === namespace
    )

    if (!pod) {
        return {
            type: 'error',
            message: `Pod "${name}" not found in namespace "${namespace}"`,
        }
    }

    return { type: 'success', data: pod }
}

export const deletePod = (
    state: ClusterStateData,
    name: string,
    namespace: string
): DeleteResult => {
    const podIndex = state.pods.findIndex(
        (p) => p.metadata.name === name && p.metadata.namespace === namespace
    )

    if (podIndex === -1) {
        return {
            type: 'error',
            message: `Pod "${name}" not found in namespace "${namespace}"`,
        }
    }

    const deletedPod = state.pods[podIndex]
    const newPods = [...state.pods.slice(0, podIndex), ...state.pods.slice(podIndex + 1)]

    return {
        type: 'success',
        data: deletedPod,
        state: {
            ...state,
            pods: newPods,
        },
    }
}

// Facade interface
export interface ClusterState {
    getPods: (namespace?: string) => Pod[]
    addPod: (pod: Pod) => void
    findPod: (name: string, namespace: string) => Result<Pod>
    deletePod: (name: string, namespace: string) => Result<Pod>
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

        deletePod: (name: string, namespace: string) => {
            const result = deletePod(state, name, namespace)
            if (result.type === 'success') {
                state = result.state
                return { type: 'success', data: result.data }
            }
            return result
        },

        toJSON: () => ({ ...state, pods: [...state.pods] }),

        loadState: (newState: ClusterStateData) => {
            state = newState
        },
    }
}


