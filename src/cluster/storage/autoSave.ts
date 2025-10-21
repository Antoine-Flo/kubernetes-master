import type { StorageAdapter } from './storageAdapter'
import type { ClusterState, ClusterStateData } from '../ClusterState'
import type { FileSystem, FileSystemState } from '../../filesystem/FileSystem'
import { createClusterState } from '../ClusterState'
import { createFileSystem } from '../../filesystem/FileSystem'

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                      AUTO-SAVE WRAPPERS                               ║
// ╚═══════════════════════════════════════════════════════════════════════╝
// Wraps ClusterState and FileSystem with automatic persistence.
// Debounces saves to avoid excessive localStorage writes.

const DEBOUNCE_DELAY_MS = 500

/**
 * Create debounced save function
 * Delays save until no changes for DEBOUNCE_DELAY_MS
 */
const createDebouncedSave = <T>(
    storage: StorageAdapter,
    key: string,
    getData: () => T
): (() => void) => {
    let timeoutId: number | null = null

    return () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId)
        }

        timeoutId = window.setTimeout(() => {
            const data = getData()
            storage.save(key, data)
            timeoutId = null
        }, DEBOUNCE_DELAY_MS)
    }
}

/**
 * Wrap ClusterState with auto-save functionality
 * Intercepts state-mutating methods and triggers debounced save
 */
export const createAutoSaveClusterState = (
    storage: StorageAdapter,
    key: string,
    initialState?: ClusterStateData
): ClusterState => {
    const clusterState = createClusterState(initialState)
    const debouncedSave = createDebouncedSave(storage, key, () => clusterState.toJSON())

    // Wrap mutating methods with auto-save
    const originalAddPod = clusterState.addPod
    const originalDeletePod = clusterState.deletePod
    const originalUpdatePod = clusterState.updatePod
    const originalAddConfigMap = clusterState.addConfigMap
    const originalDeleteConfigMap = clusterState.deleteConfigMap
    const originalUpdateConfigMap = clusterState.updateConfigMap
    const originalAddSecret = clusterState.addSecret
    const originalDeleteSecret = clusterState.deleteSecret
    const originalUpdateSecret = clusterState.updateSecret
    const originalLoadState = clusterState.loadState

    return {
        ...clusterState,
        addPod: (pod) => {
            originalAddPod(pod)
            debouncedSave()
        },
        deletePod: (name, namespace) => {
            const result = originalDeletePod(name, namespace)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        updatePod: (name, namespace, updateFn) => {
            const result = originalUpdatePod(name, namespace, updateFn)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        addConfigMap: (configMap) => {
            originalAddConfigMap(configMap)
            debouncedSave()
        },
        deleteConfigMap: (name, namespace) => {
            const result = originalDeleteConfigMap(name, namespace)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        updateConfigMap: (name, namespace, updateFn) => {
            const result = originalUpdateConfigMap(name, namespace, updateFn)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        addSecret: (secret) => {
            originalAddSecret(secret)
            debouncedSave()
        },
        deleteSecret: (name, namespace) => {
            const result = originalDeleteSecret(name, namespace)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        updateSecret: (name, namespace, updateFn) => {
            const result = originalUpdateSecret(name, namespace, updateFn)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        loadState: (state) => {
            originalLoadState(state)
            debouncedSave()
        },
    }
}

/**
 * Wrap FileSystem with auto-save functionality
 * Intercepts state-mutating methods and triggers debounced save
 */
export const createAutoSaveFileSystem = (
    storage: StorageAdapter,
    key: string,
    initialState?: FileSystemState
): FileSystem => {
    const fileSystem = createFileSystem(initialState)
    const debouncedSave = createDebouncedSave(storage, key, () => fileSystem.toJSON())

    // Wrap mutating methods with auto-save
    const originalChangeDirectory = fileSystem.changeDirectory
    const originalCreateDirectory = fileSystem.createDirectory
    const originalDeleteDirectory = fileSystem.deleteDirectory
    const originalCreateFile = fileSystem.createFile
    const originalWriteFile = fileSystem.writeFile
    const originalDeleteFile = fileSystem.deleteFile
    const originalLoadState = fileSystem.loadState

    return {
        ...fileSystem,
        changeDirectory: (path) => {
            const result = originalChangeDirectory(path)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        createDirectory: (name, recursive) => {
            const result = originalCreateDirectory(name, recursive)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        deleteDirectory: (path, recursive) => {
            const result = originalDeleteDirectory(path, recursive)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        createFile: (name, content) => {
            const result = originalCreateFile(name, content)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        writeFile: (path, content) => {
            const result = originalWriteFile(path, content)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        deleteFile: (path) => {
            const result = originalDeleteFile(path)
            if (result.ok) {
                debouncedSave()
            }
            return result
        },
        loadState: (state) => {
            originalLoadState(state)
            debouncedSave()
        },
    }
}

