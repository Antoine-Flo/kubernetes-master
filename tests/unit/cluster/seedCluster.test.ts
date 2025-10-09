import { describe, it, expect } from 'vitest'
import { createSeedCluster } from '../../../src/cluster/seedCluster'
import type { PodPhase } from '../../../src/cluster/models/Pod'

describe('Seed Cluster', () => {
    describe('createSeedCluster', () => {
        it('should return a valid ClusterState', () => {
            const clusterState = createSeedCluster()

            expect(clusterState).toBeDefined()
            expect(typeof clusterState.getPods).toBe('function')
            expect(typeof clusterState.addPod).toBe('function')
        })

        it('should have pods in seed data', () => {
            const clusterState = createSeedCluster()
            const pods = clusterState.getPods()

            expect(pods.length).toBeGreaterThanOrEqual(3)
            expect(pods.length).toBeLessThanOrEqual(5)
        })

        it('should have default namespace represented', () => {
            const clusterState = createSeedCluster()
            const defaultPods = clusterState.getPods('default')

            expect(defaultPods.length).toBeGreaterThan(0)
        })

        it('should have kube-system namespace represented', () => {
            const clusterState = createSeedCluster()
            const kubeSystemPods = clusterState.getPods('kube-system')

            expect(kubeSystemPods.length).toBeGreaterThan(0)
        })

        it('should have pods with different namespaces', () => {
            const clusterState = createSeedCluster()
            const allPods = clusterState.getPods()

            const namespaces = new Set(allPods.map((pod) => pod.metadata.namespace))

            expect(namespaces.size).toBeGreaterThanOrEqual(2)
            expect(namespaces.has('default')).toBe(true)
            expect(namespaces.has('kube-system')).toBe(true)
        })

        it('should have all pods in valid phase', () => {
            const clusterState = createSeedCluster()
            const allPods = clusterState.getPods()

            const validPhases: PodPhase[] = ['Pending', 'Running', 'Succeeded', 'Failed', 'Unknown']

            allPods.forEach((pod) => {
                expect(validPhases).toContain(pod.status.phase)
            })
        })

        it('should have pods with valid metadata', () => {
            const clusterState = createSeedCluster()
            const allPods = clusterState.getPods()

            allPods.forEach((pod) => {
                expect(pod.metadata.name).toBeDefined()
                expect(pod.metadata.name.length).toBeGreaterThan(0)
                expect(pod.metadata.namespace).toBeDefined()
                expect(pod.metadata.creationTimestamp).toBeDefined()
                expect(pod.apiVersion).toBe('v1')
                expect(pod.kind).toBe('Pod')
            })
        })

        it('should have pods with containers', () => {
            const clusterState = createSeedCluster()
            const allPods = clusterState.getPods()

            allPods.forEach((pod) => {
                expect(pod.spec.containers.length).toBeGreaterThan(0)
                pod.spec.containers.forEach((container) => {
                    expect(container.name).toBeDefined()
                    expect(container.image).toBeDefined()
                })
            })
        })

        it('should create pods with realistic names', () => {
            const clusterState = createSeedCluster()
            const allPods = clusterState.getPods()

            const podNames = allPods.map((pod) => pod.metadata.name)

            // Should have common service names
            const hasRealisticNames = podNames.some(
                (name) =>
                    name.includes('nginx') ||
                    name.includes('redis') ||
                    name.includes('postgres') ||
                    name.includes('coredns') ||
                    name.includes('kube')
            )

            expect(hasRealisticNames).toBe(true)
        })

        it('should have at least one running pod', () => {
            const clusterState = createSeedCluster()
            const allPods = clusterState.getPods()

            const runningPods = allPods.filter((pod) => pod.status.phase === 'Running')

            expect(runningPods.length).toBeGreaterThan(0)
        })

        it('should create unique pods', () => {
            const clusterState = createSeedCluster()
            const allPods = clusterState.getPods()

            const podKeys = allPods.map(
                (pod) => `${pod.metadata.namespace}/${pod.metadata.name}`
            )

            const uniqueKeys = new Set(podKeys)

            expect(uniqueKeys.size).toBe(podKeys.length)
        })
    })
})

