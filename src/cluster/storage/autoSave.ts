import type { FileSystem, FileSystemState } from '../../filesystem/FileSystem'
import { createFileSystem } from '../../filesystem/FileSystem'
import type { ClusterState, ClusterStateData } from '../ClusterState'
import { createClusterState } from '../ClusterState'
import type { EventBus } from '../events/EventBus'
import type { StorageAdapter } from './storageAdapter'

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                      AUTO-SAVE WRAPPERS                               ║
// ╚═══════════════════════════════════════════════════════════════════════╝
// Wraps ClusterState and FileSystem with automatic persistence.
// Debounces saves to avoid excessive localStorage writes.
// Uses event-driven architecture for ClusterState auto-save.

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
 * Uses event-driven approach to automatically save on mutations
 */
export const createAutoSaveClusterState = (
    storage: StorageAdapter,
    key: string,
    initialState: ClusterStateData,
    eventBus: EventBus
): ClusterState => {
    const clusterState = createClusterState(initialState, eventBus)
    const debouncedSave = createDebouncedSave(storage, key, () => clusterState.toJSON())

    // Subscribe to all mutation events and trigger save
    eventBus.subscribeAll((event) => {
        // Only save on mutation events (Created, Updated, Deleted)
        if (event.type.endsWith('Created') || event.type.endsWith('Updated') || event.type.endsWith('Deleted')) {
            debouncedSave()
        }
    })

    return clusterState
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

