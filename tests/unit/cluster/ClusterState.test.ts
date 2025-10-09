import { describe, it, expect } from 'vitest'
import { createPod } from '../../../src/cluster/models/Pod'
import {
    createEmptyState,
    addPod,
    getPods,
    findPod,
    deletePod,
    createClusterState,
    type ClusterStateData,
} from '../../../src/cluster/ClusterState'

describe('ClusterState Pure Functions', () => {
    describe('createEmptyState', () => {
        it('should return valid empty state', () => {
            const state = createEmptyState()

            expect(state).toBeDefined()
            expect(state.pods).toEqual([])
            expect(Array.isArray(state.pods)).toBe(true)
        })
    })

    describe('addPod', () => {
        it('should return new state with pod added', () => {
            const state = createEmptyState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            const newState = addPod(state, pod)

            expect(newState.pods).toHaveLength(1)
            expect(newState.pods[0]).toEqual(pod)
        })

        it('should not mutate original state (immutability)', () => {
            const state = createEmptyState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            const newState = addPod(state, pod)

            expect(state.pods).toHaveLength(0)
            expect(newState.pods).toHaveLength(1)
            expect(state).not.toBe(newState)
        })

        it('should add multiple pods', () => {
            let state = createEmptyState()
            const pod1 = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            const pod2 = createPod({
                name: 'redis',
                namespace: 'default',
                containers: [{ name: 'redis', image: 'redis:latest' }],
            })

            state = addPod(state, pod1)
            state = addPod(state, pod2)

            expect(state.pods).toHaveLength(2)
            expect(state.pods[0].metadata.name).toBe('nginx')
            expect(state.pods[1].metadata.name).toBe('redis')
        })
    })

    describe('getPods', () => {
        it('should return all pods when no namespace specified', () => {
            let state = createEmptyState()
            const pod1 = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            const pod2 = createPod({
                name: 'coredns',
                namespace: 'kube-system',
                containers: [{ name: 'coredns', image: 'coredns:latest' }],
            })

            state = addPod(state, pod1)
            state = addPod(state, pod2)

            const pods = getPods(state)

            expect(pods).toHaveLength(2)
        })

        it('should filter pods by namespace', () => {
            let state = createEmptyState()
            const pod1 = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            const pod2 = createPod({
                name: 'redis',
                namespace: 'default',
                containers: [{ name: 'redis', image: 'redis:latest' }],
            })
            const pod3 = createPod({
                name: 'coredns',
                namespace: 'kube-system',
                containers: [{ name: 'coredns', image: 'coredns:latest' }],
            })

            state = addPod(state, pod1)
            state = addPod(state, pod2)
            state = addPod(state, pod3)

            const defaultPods = getPods(state, 'default')
            const kubeSystemPods = getPods(state, 'kube-system')

            expect(defaultPods).toHaveLength(2)
            expect(kubeSystemPods).toHaveLength(1)
            expect(defaultPods[0].metadata.namespace).toBe('default')
            expect(kubeSystemPods[0].metadata.namespace).toBe('kube-system')
        })

        it('should return empty array for non-existent namespace', () => {
            const state = createEmptyState()
            const pods = getPods(state, 'non-existent')

            expect(pods).toEqual([])
        })
    })

    describe('findPod', () => {
        it('should find pod by name and namespace', () => {
            let state = createEmptyState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            state = addPod(state, pod)

            const result = findPod(state, 'nginx', 'default')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data.metadata.name).toBe('nginx')
                expect(result.data.metadata.namespace).toBe('default')
            }
        })

        it('should return error when pod not found', () => {
            const state = createEmptyState()

            const result = findPod(state, 'non-existent', 'default')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('not found')
            }
        })

        it('should distinguish pods with same name in different namespaces', () => {
            let state = createEmptyState()
            const pod1 = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            const pod2 = createPod({
                name: 'nginx',
                namespace: 'production',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            state = addPod(state, pod1)
            state = addPod(state, pod2)

            const resultDefault = findPod(state, 'nginx', 'default')
            const resultProduction = findPod(state, 'nginx', 'production')

            expect(resultDefault.type).toBe('success')
            expect(resultProduction.type).toBe('success')

            if (resultDefault.type === 'success' && resultProduction.type === 'success') {
                expect(resultDefault.data.metadata.namespace).toBe('default')
                expect(resultProduction.data.metadata.namespace).toBe('production')
            }
        })
    })

    describe('deletePod', () => {
        it('should return new state without the deleted pod', () => {
            let state = createEmptyState()
            const pod1 = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            const pod2 = createPod({
                name: 'redis',
                namespace: 'default',
                containers: [{ name: 'redis', image: 'redis:latest' }],
            })

            state = addPod(state, pod1)
            state = addPod(state, pod2)

            const result = deletePod(state, 'nginx', 'default')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.state.pods).toHaveLength(1)
                expect(result.state.pods[0].metadata.name).toBe('redis')
            }
        })

        it('should not mutate original state when deleting', () => {
            let state = createEmptyState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            state = addPod(state, pod)
            const originalLength = state.pods.length

            deletePod(state, 'nginx', 'default')

            expect(state.pods).toHaveLength(originalLength)
        })

        it('should return error when pod not found', () => {
            const state = createEmptyState()

            const result = deletePod(state, 'non-existent', 'default')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('not found')
            }
        })

        it('should return the deleted pod in success result', () => {
            let state = createEmptyState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            state = addPod(state, pod)

            const result = deletePod(state, 'nginx', 'default')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toEqual(pod)
            }
        })
    })
})

describe('ClusterState Facade', () => {
    describe('createClusterState', () => {
        it('should create cluster state with empty initial state', () => {
            const clusterState = createClusterState()

            expect(clusterState).toBeDefined()
            expect(clusterState.getPods()).toEqual([])
        })

        it('should create cluster state with initial state', () => {
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            const initialState: ClusterStateData = {
                pods: [pod],
            }

            const clusterState = createClusterState(initialState)

            expect(clusterState.getPods()).toHaveLength(1)
            expect(clusterState.getPods()[0]).toEqual(pod)
        })
    })

    describe('facade methods', () => {
        it('should add pod without passing state explicitly', () => {
            const clusterState = createClusterState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            clusterState.addPod(pod)

            expect(clusterState.getPods()).toHaveLength(1)
        })

        it('should get pods without passing state explicitly', () => {
            const clusterState = createClusterState()
            const pod1 = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            const pod2 = createPod({
                name: 'coredns',
                namespace: 'kube-system',
                containers: [{ name: 'coredns', image: 'coredns:latest' }],
            })

            clusterState.addPod(pod1)
            clusterState.addPod(pod2)

            expect(clusterState.getPods()).toHaveLength(2)
            expect(clusterState.getPods('default')).toHaveLength(1)
            expect(clusterState.getPods('kube-system')).toHaveLength(1)
        })

        it('should find pod without passing state explicitly', () => {
            const clusterState = createClusterState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            clusterState.addPod(pod)

            const result = clusterState.findPod('nginx', 'default')

            expect(result.type).toBe('success')
        })

        it('should delete pod without passing state explicitly', () => {
            const clusterState = createClusterState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            clusterState.addPod(pod)
            const result = clusterState.deletePod('nginx', 'default')

            expect(result.type).toBe('success')
            expect(clusterState.getPods()).toHaveLength(0)
        })

        it('should maintain state across multiple operations', () => {
            const clusterState = createClusterState()

            const pod1 = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            const pod2 = createPod({
                name: 'redis',
                namespace: 'default',
                containers: [{ name: 'redis', image: 'redis:latest' }],
            })

            clusterState.addPod(pod1)
            expect(clusterState.getPods()).toHaveLength(1)

            clusterState.addPod(pod2)
            expect(clusterState.getPods()).toHaveLength(2)

            clusterState.deletePod('nginx', 'default')
            expect(clusterState.getPods()).toHaveLength(1)
            expect(clusterState.getPods()[0].metadata.name).toBe('redis')
        })
    })

    describe('toJSON and loadState', () => {
        it('should export current state as JSON', () => {
            const clusterState = createClusterState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            clusterState.addPod(pod)

            const json = clusterState.toJSON()

            expect(json).toBeDefined()
            expect(json.pods).toHaveLength(1)
            expect(json.pods[0].metadata.name).toBe('nginx')
        })

        it('should load state from JSON', () => {
            const clusterState = createClusterState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            const stateData: ClusterStateData = {
                pods: [pod],
            }

            clusterState.loadState(stateData)

            expect(clusterState.getPods()).toHaveLength(1)
            expect(clusterState.getPods()[0]).toEqual(pod)
        })

        it('should replace existing state when loading', () => {
            const clusterState = createClusterState()
            const pod1 = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })
            const pod2 = createPod({
                name: 'redis',
                namespace: 'default',
                containers: [{ name: 'redis', image: 'redis:latest' }],
            })

            clusterState.addPod(pod1)
            expect(clusterState.getPods()).toHaveLength(1)

            const newState: ClusterStateData = {
                pods: [pod2],
            }

            clusterState.loadState(newState)

            expect(clusterState.getPods()).toHaveLength(1)
            expect(clusterState.getPods()[0].metadata.name).toBe('redis')
        })
    })
})

