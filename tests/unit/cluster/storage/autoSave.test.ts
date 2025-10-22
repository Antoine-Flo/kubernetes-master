import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyState, type ClusterStateData } from '../../../../src/cluster/ClusterState'
import { createEventBus } from '../../../../src/cluster/events/EventBus'
import { createConfigMapCreatedEvent, createPodCreatedEvent, createPodDeletedEvent, createPodUpdatedEvent, createSecretCreatedEvent } from '../../../../src/cluster/events/types'
import { createConfigMap } from '../../../../src/cluster/ressources/ConfigMap'
import { createPod } from '../../../../src/cluster/ressources/Pod'
import { createSecret } from '../../../../src/cluster/ressources/Secret'
import { createAutoSaveClusterState, createAutoSaveFileSystem } from '../../../../src/cluster/storage/autoSave'
import { createStorageAdapter } from '../../../../src/cluster/storage/storageAdapter'
import type { FileSystemState } from '../../../../src/filesystem/FileSystem'

describe('AutoSave', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('ClusterState auto-save', () => {
        it('should auto-save when adding a pod', () => {
            const storage = createStorageAdapter()
            const eventBus = createEventBus()
            createAutoSaveClusterState(storage, 'test-cluster', createEmptyState(), eventBus)

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            // Emit event instead of calling addPod directly
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            // Trigger debounce
            vi.advanceTimersByTime(500)

            const result = storage.load<ClusterStateData>('test-cluster')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.pods.items).toHaveLength(1)
                expect(result.value.pods.items[0].metadata.name).toBe('test-pod')
            }
        })

        it('should debounce multiple rapid changes', () => {
            const storage = createStorageAdapter()
            const saveSpy = vi.spyOn(storage, 'save')
            const eventBus = createEventBus()
            createAutoSaveClusterState(storage, 'test-cluster', createEmptyState(), eventBus)

            // Add multiple pods rapidly via events
            for (let i = 0; i < 5; i++) {
                const pod = createPod({
                    name: `pod-${i}`,
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                })
                eventBus.emit(createPodCreatedEvent(pod, 'test'))
                vi.advanceTimersByTime(100) // Less than debounce delay
            }

            // Should not have saved yet
            expect(saveSpy).not.toHaveBeenCalled()

            // Wait for debounce
            vi.advanceTimersByTime(500)

            // Should have saved once
            expect(saveSpy).toHaveBeenCalledTimes(1)
        })

        it('should auto-save when deleting a pod', () => {
            const storage = createStorageAdapter()
            const eventBus = createEventBus()
            createAutoSaveClusterState(storage, 'test-cluster', createEmptyState(), eventBus)

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            eventBus.emit(createPodCreatedEvent(pod, 'test'))
            vi.advanceTimersByTime(500)

            eventBus.emit(createPodDeletedEvent('test-pod', 'default', pod, 'test'))
            vi.advanceTimersByTime(500)

            const result = storage.load<ClusterStateData>('test-cluster')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.pods.items).toHaveLength(0)
            }
        })

        it('should auto-save when updating a pod', () => {
            const storage = createStorageAdapter()
            const eventBus = createEventBus()
            createAutoSaveClusterState(storage, 'test-cluster', createEmptyState(), eventBus)

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
                phase: 'Pending',
            })

            eventBus.emit(createPodCreatedEvent(pod, 'test'))
            vi.advanceTimersByTime(500)

            const updatedPod = { ...pod, status: { ...pod.status, phase: 'Running' as const } }
            eventBus.emit(createPodUpdatedEvent('test-pod', 'default', updatedPod, pod, 'test'))
            vi.advanceTimersByTime(500)

            const result = storage.load<ClusterStateData>('test-cluster')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.pods.items[0].status.phase).toBe('Running')
            }
        })

        it('should auto-save when adding a ConfigMap', () => {
            const storage = createStorageAdapter()
            const eventBus = createEventBus()
            createAutoSaveClusterState(storage, 'test-cluster', createEmptyState(), eventBus)

            const configMap = createConfigMap({
                name: 'test-config',
                namespace: 'default',
                data: { key: 'value' },
            })

            eventBus.emit(createConfigMapCreatedEvent(configMap, 'test'))
            vi.advanceTimersByTime(500)

            const result = storage.load<ClusterStateData>('test-cluster')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.configMaps.items).toHaveLength(1)
                expect(result.value.configMaps.items[0].metadata.name).toBe('test-config')
            }
        })

        it('should auto-save when adding a Secret', () => {
            const storage = createStorageAdapter()
            const eventBus = createEventBus()
            createAutoSaveClusterState(storage, 'test-cluster', createEmptyState(), eventBus)

            const secret = createSecret({
                name: 'test-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: { password: 'c2VjcmV0' },
            })

            eventBus.emit(createSecretCreatedEvent(secret, 'test'))
            vi.advanceTimersByTime(500)

            const result = storage.load<ClusterStateData>('test-cluster')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.secrets.items).toHaveLength(1)
                expect(result.value.secrets.items[0].metadata.name).toBe('test-secret')
            }
        })

        it('should not auto-save on failed operations', () => {
            const storage = createStorageAdapter()
            const saveSpy = vi.spyOn(storage, 'save')
            const eventBus = createEventBus()
            const clusterState = createAutoSaveClusterState(storage, 'test-cluster', createEmptyState(), eventBus)

            // Try to delete non-existent pod
            clusterState.deletePod('non-existent', 'default')
            vi.advanceTimersByTime(500)

            // Should not have saved
            expect(saveSpy).not.toHaveBeenCalled()
        })

        it('should load initial state correctly', () => {
            const storage = createStorageAdapter()

            const pod = createPod({
                name: 'existing-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            const initialState = {
                pods: { items: [pod] },
                configMaps: { items: [] },
                secrets: { items: [] },
            }

            const eventBus = createEventBus()
            const clusterState = createAutoSaveClusterState(storage, 'test-cluster', initialState, eventBus)

            const pods = clusterState.getPods()
            expect(pods).toHaveLength(1)
            expect(pods[0].metadata.name).toBe('existing-pod')
        })
    })

    describe('FileSystem auto-save', () => {
        it('should auto-save when creating a directory', () => {
            const storage = createStorageAdapter()
            const fileSystem = createAutoSaveFileSystem(storage, 'test-filesystem')

            fileSystem.createDirectory('test-dir')
            vi.advanceTimersByTime(500)

            const result = storage.load<FileSystemState>('test-filesystem')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.tree.children.has('test-dir')).toBe(true)
            }
        })

        it('should auto-save when creating a file', () => {
            const storage = createStorageAdapter()
            const fileSystem = createAutoSaveFileSystem(storage, 'test-filesystem')

            fileSystem.createFile('test.yaml', 'Hello World')
            vi.advanceTimersByTime(500)

            const result = storage.load<FileSystemState>('test-filesystem')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.tree.children.has('test.yaml')).toBe(true)
            }
        })

        it('should auto-save when writing to a file', () => {
            const storage = createStorageAdapter()
            const fileSystem = createAutoSaveFileSystem(storage, 'test-filesystem')

            fileSystem.createFile('test.yaml', 'Original content')
            vi.advanceTimersByTime(500)

            fileSystem.writeFile('test.yaml', 'Updated content')
            vi.advanceTimersByTime(500)

            const result = storage.load<FileSystemState>('test-filesystem')
            expect(result.ok).toBe(true)
            if (result.ok) {
                const file = result.value.tree.children.get('test.yaml')
                expect(file).toBeDefined()
                if (file && file.type === 'file') {
                    expect(file.content).toBe('Updated content')
                }
            }
        })

        it('should auto-save when changing directory', () => {
            const storage = createStorageAdapter()
            const fileSystem = createAutoSaveFileSystem(storage, 'test-filesystem')

            fileSystem.createDirectory('test-dir')
            vi.advanceTimersByTime(500)

            fileSystem.changeDirectory('test-dir')
            vi.advanceTimersByTime(500)

            const result = storage.load<FileSystemState>('test-filesystem')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.currentPath).toBe('/test-dir')
            }
        })

        it('should auto-save when deleting a file', () => {
            const storage = createStorageAdapter()
            const fileSystem = createAutoSaveFileSystem(storage, 'test-filesystem')

            fileSystem.createFile('test.yaml', 'content')
            vi.advanceTimersByTime(500)

            fileSystem.deleteFile('test.yaml')
            vi.advanceTimersByTime(500)

            const result = storage.load<FileSystemState>('test-filesystem')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.tree.children.has('test.yaml')).toBe(false)
            }
        })

        it('should debounce multiple rapid file operations', () => {
            const storage = createStorageAdapter()
            const saveSpy = vi.spyOn(storage, 'save')
            const fileSystem = createAutoSaveFileSystem(storage, 'test-filesystem')

            // Create multiple files rapidly
            for (let i = 0; i < 5; i++) {
                fileSystem.createFile(`file${i}.yaml`, `content ${i}`)
                vi.advanceTimersByTime(100)
            }

            // Should not have saved yet
            expect(saveSpy).not.toHaveBeenCalled()

            // Wait for debounce
            vi.advanceTimersByTime(500)

            // Should have saved once
            expect(saveSpy).toHaveBeenCalledTimes(1)
        })

        it('should not auto-save on failed operations', () => {
            const storage = createStorageAdapter()
            const saveSpy = vi.spyOn(storage, 'save')
            const fileSystem = createAutoSaveFileSystem(storage, 'test-filesystem')

            // Try to delete non-existent file
            fileSystem.deleteFile('non-existent.yaml')
            vi.advanceTimersByTime(500)

            // Should not have saved
            expect(saveSpy).not.toHaveBeenCalled()
        })

        it('should preserve Map structure across save/load', () => {
            const storage = createStorageAdapter()
            const fileSystem = createAutoSaveFileSystem(storage, 'test-filesystem')

            fileSystem.createDirectory('dir1')
            fileSystem.createFile('file1.yaml', 'content1')
            vi.advanceTimersByTime(500)

            // Load from storage
            const loadResult = storage.load<FileSystemState>('test-filesystem')
            expect(loadResult.ok).toBe(true)
            if (loadResult.ok) {
                expect(loadResult.value.tree.children).toBeInstanceOf(Map)
                // Fresh filesystem, so just our 2 items
                expect(loadResult.value.tree.children.size).toBe(2)
            }
        })
    })

    describe('loadState with auto-save', () => {
        it('should trigger auto-save when loadState is called on ClusterState', () => {
            const storage = createStorageAdapter()
            const eventBus = createEventBus()
            const clusterState = createAutoSaveClusterState(storage, 'test-cluster', createEmptyState(), eventBus)

            const pod1 = createPod({
                name: 'initial-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            // Load state with initial pod
            const newState = {
                pods: { items: [pod1] },
                configMaps: { items: [] },
                secrets: { items: [] },
            }

            clusterState.loadState(newState)
            
            // Add another pod which will trigger auto-save
            const pod2 = createPod({
                name: 'added-pod',
                namespace: 'default',
                containers: [{ name: 'redis', image: 'redis:latest' }],
            })
            clusterState.addPod(pod2)
            vi.advanceTimersByTime(500)

            const result = storage.load<ClusterStateData>('test-cluster')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.pods.items).toHaveLength(2)
                expect(result.value.pods.items.some(p => p.metadata.name === 'initial-pod')).toBe(true)
                expect(result.value.pods.items.some(p => p.metadata.name === 'added-pod')).toBe(true)
            }
        })

        it('should trigger auto-save when loadState is called on FileSystem', () => {
            const storage = createStorageAdapter()
            const fileSystem = createAutoSaveFileSystem(storage, 'test-filesystem')

            const newState = {
                currentPath: '/new-path',
                tree: {
                    type: 'directory' as const,
                    name: 'root',
                    path: '/',
                    children: new Map(),
                },
            }

            fileSystem.loadState(newState)
            vi.advanceTimersByTime(500)

            const result = storage.load<FileSystemState>('test-filesystem')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.currentPath).toBe('/new-path')
            }
        })
    })
})

