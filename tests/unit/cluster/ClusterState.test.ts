import { describe, it, expect } from 'vitest'
import { createPod } from '../../../src/cluster/models/Pod'
import { createConfigMap } from '../../../src/cluster/models/ConfigMap'
import { createSecret } from '../../../src/cluster/models/Secret'
import {
    createEmptyState,
    addPod,
    getPods,
    findPod,
    deletePod,
    addConfigMap,
    getConfigMaps,
    findConfigMap,
    deleteConfigMap,
    addSecret,
    getSecrets,
    findSecret,
    deleteSecret,
    createClusterState,
    type ClusterStateData,
} from '../../../src/cluster/ClusterState'

describe('ClusterState Pure Functions', () => {
    describe('createEmptyState', () => {
        it('should return valid empty state', () => {
            const state = createEmptyState()

            expect(state).toBeDefined()
            expect(state.pods).toEqual({ items: [] })
            expect(state.configMaps).toEqual({ items: [] })
            expect(state.secrets).toEqual({ items: [] })
            expect(Array.isArray(state.pods.items)).toBe(true)
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

            expect(newState.pods.items).toHaveLength(1)
            expect(newState.pods.items[0]).toEqual(pod)
        })

        it('should not mutate original state (immutability)', () => {
            const state = createEmptyState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            const newState = addPod(state, pod)

            expect(state.pods.items).toHaveLength(0)
            expect(newState.pods.items).toHaveLength(1)
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

            expect(state.pods.items).toHaveLength(2)
            expect(state.pods.items[0].metadata.name).toBe('nginx')
            expect(state.pods.items[1].metadata.name).toBe('redis')
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

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.metadata.name).toBe('nginx')
                expect(result.value.metadata.namespace).toBe('default')
            }
        })

        it('should return error when pod not found', () => {
            const state = createEmptyState()

            const result = findPod(state, 'non-existent', 'default')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not found')
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

            expect(resultDefault.ok).toBe(true)
            expect(resultProduction.ok).toBe(true)

            if (resultDefault.ok && resultProduction.ok) {
                expect(resultDefault.value.metadata.namespace).toBe('default')
                expect(resultProduction.value.metadata.namespace).toBe('production')
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

            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                expect(result.state.pods.items).toHaveLength(1)
                expect(result.state.pods.items[0].metadata.name).toBe('redis')
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
            const originalLength = state.pods.items.length

            deletePod(state, 'nginx', 'default')

            expect(state.pods.items).toHaveLength(originalLength)
        })

        it('should return error when pod not found', () => {
            const state = createEmptyState()

            const result = deletePod(state, 'non-existent', 'default')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not found')
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

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toEqual(pod)
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
                pods: { items: [pod] },
                configMaps: { items: [] },
                secrets: { items: [] },
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

            expect(result.ok).toBe(true)
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

            expect(result.ok).toBe(true)
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
            expect(json.pods.items).toHaveLength(1)
            expect(json.pods.items[0].metadata.name).toBe('nginx')
        })

        it('should load state from JSON', () => {
            const clusterState = createClusterState()
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            const stateData: ClusterStateData = {
                pods: { items: [pod] },
                configMaps: { items: [] },
                secrets: { items: [] },
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
                pods: { items: [pod2] },
                configMaps: { items: [] },
                secrets: { items: [] },
            }

            clusterState.loadState(newState)

            expect(clusterState.getPods()).toHaveLength(1)
            expect(clusterState.getPods()[0].metadata.name).toBe('redis')
        })
    })

    describe('ConfigMap Operations', () => {
        it('should add configmap to state', () => {
            const clusterState = createClusterState()
            const configMap = createConfigMap({
                name: 'app-config',
                namespace: 'default',
                data: { key: 'value' },
            })

            clusterState.addConfigMap(configMap)

            expect(clusterState.getConfigMaps()).toHaveLength(1)
            expect(clusterState.getConfigMaps()[0].metadata.name).toBe('app-config')
        })

        it('should get configmaps by namespace', () => {
            const clusterState = createClusterState()
            const cm1 = createConfigMap({
                name: 'cm1',
                namespace: 'default',
                data: {},
            })
            const cm2 = createConfigMap({
                name: 'cm2',
                namespace: 'kube-system',
                data: {},
            })

            clusterState.addConfigMap(cm1)
            clusterState.addConfigMap(cm2)

            expect(clusterState.getConfigMaps('default')).toHaveLength(1)
            expect(clusterState.getConfigMaps('kube-system')).toHaveLength(1)
        })

        it('should find configmap by name and namespace', () => {
            const clusterState = createClusterState()
            const configMap = createConfigMap({
                name: 'app-config',
                namespace: 'default',
                data: { key: 'value' },
            })

            clusterState.addConfigMap(configMap)

            const result = clusterState.findConfigMap('app-config', 'default')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.metadata.name).toBe('app-config')
            }
        })

        it('should return error when configmap not found', () => {
            const clusterState = createClusterState()

            const result = clusterState.findConfigMap('missing', 'default')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not found')
            }
        })

        it('should delete configmap by name and namespace', () => {
            const clusterState = createClusterState()
            const configMap = createConfigMap({
                name: 'app-config',
                namespace: 'default',
                data: { key: 'value' },
            })

            clusterState.addConfigMap(configMap)
            expect(clusterState.getConfigMaps()).toHaveLength(1)

            const result = clusterState.deleteConfigMap('app-config', 'default')

            expect(result.ok).toBe(true)
            expect(clusterState.getConfigMaps()).toHaveLength(0)
        })

        it('should return error when deleting non-existent configmap', () => {
            const clusterState = createClusterState()

            const result = clusterState.deleteConfigMap('missing', 'default')

            expect(result.ok).toBe(false)
        })
    })

    describe('Secret Operations', () => {
        it('should add secret to state', () => {
            const clusterState = createClusterState()
            const secret = createSecret({
                name: 'db-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: { password: 'cGFzc3dvcmQ=' },
            })

            clusterState.addSecret(secret)

            expect(clusterState.getSecrets()).toHaveLength(1)
            expect(clusterState.getSecrets()[0].metadata.name).toBe('db-secret')
        })

        it('should get secrets by namespace', () => {
            const clusterState = createClusterState()
            const secret1 = createSecret({
                name: 'secret1',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: {},
            })
            const secret2 = createSecret({
                name: 'secret2',
                namespace: 'kube-system',
                secretType: { type: 'Opaque' },
                data: {},
            })

            clusterState.addSecret(secret1)
            clusterState.addSecret(secret2)

            expect(clusterState.getSecrets('default')).toHaveLength(1)
            expect(clusterState.getSecrets('kube-system')).toHaveLength(1)
        })

        it('should find secret by name and namespace', () => {
            const clusterState = createClusterState()
            const secret = createSecret({
                name: 'db-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: { password: 'cGFzc3dvcmQ=' },
            })

            clusterState.addSecret(secret)

            const result = clusterState.findSecret('db-secret', 'default')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.metadata.name).toBe('db-secret')
            }
        })

        it('should return error when secret not found', () => {
            const clusterState = createClusterState()

            const result = clusterState.findSecret('missing', 'default')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not found')
            }
        })

        it('should delete secret by name and namespace', () => {
            const clusterState = createClusterState()
            const secret = createSecret({
                name: 'db-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: { password: 'cGFzc3dvcmQ=' },
            })

            clusterState.addSecret(secret)
            expect(clusterState.getSecrets()).toHaveLength(1)

            const result = clusterState.deleteSecret('db-secret', 'default')

            expect(result.ok).toBe(true)
            expect(clusterState.getSecrets()).toHaveLength(0)
        })

        it('should return error when deleting non-existent secret', () => {
            const clusterState = createClusterState()

            const result = clusterState.deleteSecret('missing', 'default')

            expect(result.ok).toBe(false)
        })
    })
})

