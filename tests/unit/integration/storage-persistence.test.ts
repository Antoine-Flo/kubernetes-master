import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClusterStateData } from '../../../src/cluster/ClusterState'
import { createEventBus } from '../../../src/cluster/events/EventBus'
import type { Pod } from '../../../src/cluster/ressources/Pod'
import { createPod } from '../../../src/cluster/ressources/Pod'
import { createSeedCluster } from '../../../src/cluster/seedCluster'
import { createAutoSaveClusterState, createAutoSaveFileSystem } from '../../../src/cluster/storage/autoSave'
import { createStorageAdapter } from '../../../src/cluster/storage/storageAdapter'
import type { FileSystemState } from '../../../src/filesystem/FileSystem'
import { createSeedFileSystem } from '../../../src/filesystem/seedFileSystem'

describe('Storage Persistence Integration', () => {
    const CLUSTER_STATE_KEY = 'kube-simulator:cluster-state'
    const FILESYSTEM_STATE_KEY = 'kube-simulator:filesystem-state'

    beforeEach(() => {
        localStorage.clear()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('Fresh initialization', () => {
        it('should create seed cluster data when no stored data exists', () => {
            const storage = createStorageAdapter()

            // Verify no data in storage
            const loadResult = storage.load(CLUSTER_STATE_KEY)
            expect(loadResult.ok).toBe(false)

            // Initialize as in main.ts
            const loadedClusterState = storage.load<ClusterStateData>(CLUSTER_STATE_KEY)
            const clusterStateData = loadedClusterState.ok ? loadedClusterState.value : createSeedCluster().toJSON()
            const eventBus = createEventBus()
            const clusterState = createAutoSaveClusterState(storage, CLUSTER_STATE_KEY, clusterStateData, eventBus)

            // Should have seed data
            const pods = clusterState.getPods()
            expect(pods.length).toBeGreaterThan(0)

            // Trigger a mutation to activate auto-save
            const testPod = createPod({
                name: 'test-save-trigger',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            clusterState.addPod(testPod)

            // Trigger auto-save
            vi.advanceTimersByTime(500)

            // Verify data is now in storage
            const savedResult = storage.load(CLUSTER_STATE_KEY)
            expect(savedResult.ok).toBe(true)
        })

        it('should create seed filesystem data when no stored data exists', () => {
            const storage = createStorageAdapter()

            // Verify no data in storage
            const loadResult = storage.load(FILESYSTEM_STATE_KEY)
            expect(loadResult.ok).toBe(false)

            // Initialize as in main.ts
            const loadedFileSystemState = storage.load<FileSystemState>(FILESYSTEM_STATE_KEY)
            const fileSystemState = loadedFileSystemState.ok ? loadedFileSystemState.value : createSeedFileSystem()
            const fileSystem = createAutoSaveFileSystem(storage, FILESYSTEM_STATE_KEY, fileSystemState)

            // Should have seed data
            const listResult = fileSystem.listDirectory()
            expect(listResult.ok).toBe(true)
            if (listResult.ok) {
                expect(listResult.value.length).toBeGreaterThan(0)
            }

            // Trigger a mutation to activate auto-save
            fileSystem.createFile('test-trigger.yaml', 'test')

            // Trigger auto-save
            vi.advanceTimersByTime(500)

            // Verify data is now in storage
            const savedResult = storage.load(FILESYSTEM_STATE_KEY)
            expect(savedResult.ok).toBe(true)
        })
    })

    describe('State changes are persisted', () => {
        it('should persist cluster state changes to localStorage', () => {
            const storage = createStorageAdapter()
            const clusterStateData = createSeedCluster().toJSON()
            const eventBus = createEventBus()
            const clusterState = createAutoSaveClusterState(storage, CLUSTER_STATE_KEY, clusterStateData, eventBus)

            const initialPodCount = clusterState.getPods().length

            // Add a new pod
            const newPod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            clusterState.addPod(newPod)

            // Trigger auto-save
            vi.advanceTimersByTime(500)

            // Load from storage and verify
            const loadResult = storage.load<ClusterStateData>(CLUSTER_STATE_KEY)
            expect(loadResult.ok).toBe(true)
            if (loadResult.ok) {
                expect(loadResult.value.pods.items.length).toBe(initialPodCount + 1)
                const savedPod = loadResult.value.pods.items.find((p: Pod) => p.metadata.name === 'test-pod')
                expect(savedPod).toBeDefined()
            }
        })

        it('should persist filesystem changes to localStorage', () => {
            const storage = createStorageAdapter()
            const fileSystemState = createSeedFileSystem()
            const fileSystem = createAutoSaveFileSystem(storage, FILESYSTEM_STATE_KEY, fileSystemState)

            // Create a new file
            fileSystem.createFile('new-file.yaml', 'Test content')

            // Trigger auto-save
            vi.advanceTimersByTime(500)

            // Load from storage and verify
            const loadResult = storage.load<FileSystemState>(FILESYSTEM_STATE_KEY)
            expect(loadResult.ok).toBe(true)
            if (loadResult.ok) {
                expect(loadResult.value.tree.children.has('new-file.yaml')).toBe(true)
                const file = loadResult.value.tree.children.get('new-file.yaml')
                if (file && file.type === 'file') {
                    expect(file.content).toBe('Test content')
                }
            }
        })
    })

    describe('Page reload restores state correctly', () => {
        it('should restore cluster state after page reload', () => {
            const storage = createStorageAdapter()

            // First "session" - create and save state
            const clusterStateData = createSeedCluster().toJSON()
            const eventBus1 = createEventBus()
            const clusterState1 = createAutoSaveClusterState(storage, CLUSTER_STATE_KEY, clusterStateData, eventBus1)

            const newPod = createPod({
                name: 'persistent-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            clusterState1.addPod(newPod)
            vi.advanceTimersByTime(500)

            // Simulate page reload - load from storage
            const loadedClusterState = storage.load<ClusterStateData>(CLUSTER_STATE_KEY)
            const clusterStateData2 = loadedClusterState.ok ? loadedClusterState.value : createSeedCluster().toJSON()
            const eventBus2 = createEventBus()
            const clusterState2 = createAutoSaveClusterState(storage, CLUSTER_STATE_KEY, clusterStateData2, eventBus2)

            // Should have the pod from previous session
            const pods = clusterState2.getPods()
            const persistedPod = pods.find(p => p.metadata.name === 'persistent-pod')
            expect(persistedPod).toBeDefined()
            expect(persistedPod?.metadata.namespace).toBe('default')
        })

        it('should restore filesystem state after page reload', () => {
            const storage = createStorageAdapter()

            // First "session" - create and save state
            const fileSystemState1 = createSeedFileSystem()
            const fileSystem1 = createAutoSaveFileSystem(storage, FILESYSTEM_STATE_KEY, fileSystemState1)

            fileSystem1.createFile('persistent-file.yaml', 'Persistent content')
            fileSystem1.changeDirectory('examples')
            vi.advanceTimersByTime(500)

            // Simulate page reload - load from storage
            const loadedFileSystemState = storage.load<FileSystemState>(FILESYSTEM_STATE_KEY)
            const fileSystemState2 = loadedFileSystemState.ok ? loadedFileSystemState.value : createSeedFileSystem()
            const fileSystem2 = createAutoSaveFileSystem(storage, FILESYSTEM_STATE_KEY, fileSystemState2)

            // Should be in the same directory as before reload
            expect(fileSystem2.getCurrentPath()).toBe('/examples')

            // Should have the file from previous session (need to cd back to read it)
            fileSystem2.changeDirectory('/')
            const readResult = fileSystem2.readFile('persistent-file.yaml')
            expect(readResult.ok).toBe(true)
            if (readResult.ok) {
                expect(readResult.value).toBe('Persistent content')
            }
        })
    })

    describe('Independent persistence', () => {
        it('should persist ClusterState and FileSystem independently', () => {
            const storage = createStorageAdapter()

            // Initialize both
            const clusterStateData = createSeedCluster().toJSON()
            const eventBus = createEventBus()
            const clusterState = createAutoSaveClusterState(storage, CLUSTER_STATE_KEY, clusterStateData, eventBus)

            const fileSystemState = createSeedFileSystem()
            const fileSystem = createAutoSaveFileSystem(storage, FILESYSTEM_STATE_KEY, fileSystemState)

            // Modify cluster state
            const newPod = createPod({
                name: 'cluster-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            clusterState.addPod(newPod)
            vi.advanceTimersByTime(500)

            // Modify filesystem
            fileSystem.createFile('fs-file.yaml', 'content')
            vi.advanceTimersByTime(500)

            // Verify both are stored separately
            const clusterLoad = storage.load<ClusterStateData>(CLUSTER_STATE_KEY)
            const fileSystemLoad = storage.load<FileSystemState>(FILESYSTEM_STATE_KEY)

            expect(clusterLoad.ok).toBe(true)
            expect(fileSystemLoad.ok).toBe(true)

            if (clusterLoad.ok) {
                const hasPod = clusterLoad.value.pods.items.some((p: Pod) => p.metadata.name === 'cluster-pod')
                expect(hasPod).toBe(true)
            }

            if (fileSystemLoad.ok) {
                expect(fileSystemLoad.value.tree.children.has('fs-file.yaml')).toBe(true)
            }
        })
    })

    describe('Auto-save debouncing', () => {
        it('should debounce rapid changes correctly', () => {
            const storage = createStorageAdapter()
            const saveSpy = vi.spyOn(storage, 'save')

            const clusterStateData = createSeedCluster().toJSON()
            const eventBus = createEventBus()
            const clusterState = createAutoSaveClusterState(storage, CLUSTER_STATE_KEY, clusterStateData, eventBus)

            // Make rapid changes
            for (let i = 0; i < 10; i++) {
                const pod = createPod({
                    name: `pod-${i}`,
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                })
                clusterState.addPod(pod)
                vi.advanceTimersByTime(100) // Less than debounce delay
            }

            // Should not have saved yet
            expect(saveSpy).not.toHaveBeenCalled()

            // Wait for debounce
            vi.advanceTimersByTime(500)

            // Should have saved once
            expect(saveSpy).toHaveBeenCalledTimes(1)

            // Verify all changes are persisted
            const loadResult = storage.load<ClusterStateData>(CLUSTER_STATE_KEY)
            expect(loadResult.ok).toBe(true)
            if (loadResult.ok) {
                const podCount = loadResult.value.pods.items.filter((p: Pod) => p.metadata.name.startsWith('pod-')).length
                expect(podCount).toBe(10)
            }
        })
    })

    describe('Clear/reset functionality', () => {
        it('should clear cluster state from storage', () => {
            const storage = createStorageAdapter()

            const clusterStateData = createSeedCluster().toJSON()
            const eventBus = createEventBus()
            const clusterState = createAutoSaveClusterState(storage, CLUSTER_STATE_KEY, clusterStateData, eventBus)

            const newPod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            clusterState.addPod(newPod)
            vi.advanceTimersByTime(500)

            // Verify data exists
            const loadResult = storage.load<ClusterStateData>(CLUSTER_STATE_KEY)
            expect(loadResult.ok).toBe(true)

            // Clear storage
            storage.clear(CLUSTER_STATE_KEY)

            // Verify data is gone
            const loadResult2 = storage.load<ClusterStateData>(CLUSTER_STATE_KEY)
            expect(loadResult2.ok).toBe(false)
        })

        it('should clear all storage data', () => {
            const storage = createStorageAdapter()

            const clusterStateData = createSeedCluster().toJSON()
            const eventBus = createEventBus()
            const clusterState = createAutoSaveClusterState(storage, CLUSTER_STATE_KEY, clusterStateData, eventBus)

            const fileSystemState = createSeedFileSystem()
            const fileSystem = createAutoSaveFileSystem(storage, FILESYSTEM_STATE_KEY, fileSystemState)

            clusterState.addPod(createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            }))
            fileSystem.createFile('test.yaml', 'content')
            vi.advanceTimersByTime(500)

            // Clear all storage
            storage.clearAll()

            // Verify all data is gone
            const clusterLoad = storage.load<ClusterStateData>(CLUSTER_STATE_KEY)
            const fileSystemLoad = storage.load<FileSystemState>(FILESYSTEM_STATE_KEY)

            expect(clusterLoad.ok).toBe(false)
            expect(fileSystemLoad.ok).toBe(false)
        })
    })

    describe('Error handling', () => {
        it('should gracefully handle corrupted storage data', () => {
            const storage = createStorageAdapter()

            // Store invalid JSON
            localStorage.setItem(CLUSTER_STATE_KEY, '{invalid json}')

            // Should fall back to seed data
            const loadedClusterState = storage.load<ClusterStateData>(CLUSTER_STATE_KEY)
            const clusterStateData = loadedClusterState.ok ? loadedClusterState.value : createSeedCluster().toJSON()
            const eventBus = createEventBus()
            const clusterState = createAutoSaveClusterState(storage, CLUSTER_STATE_KEY, clusterStateData, eventBus)

            // Should have seed data
            const pods = clusterState.getPods()
            expect(pods.length).toBeGreaterThan(0)
        })
    })
})

