import { describe, it, expect } from 'vitest'
import { createPod, type Pod, type Container } from '../../../../src/cluster/models/Pod'

describe('Pod Model', () => {
    describe('createPod', () => {
        it('should create a pod with minimal config', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            expect(pod).toBeDefined()
            expect(pod.metadata.name).toBe('test-pod')
            expect(pod.metadata.namespace).toBe('default')
            expect(pod.spec.containers).toEqual(containers)
        })

        it('should set default values correctly', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.apiVersion).toBe('v1')
            expect(pod.kind).toBe('Pod')
            expect(pod.status.phase).toBe('Pending')
            expect(pod.status.restartCount).toBe(0)
        })

        it('should accept optional labels', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const labels = { app: 'web', env: 'prod' }
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
                labels,
            })

            expect(pod.metadata.labels).toEqual(labels)
        })

        it('should create pod without labels when not provided', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.metadata.labels).toBeUndefined()
        })

        it('should set creationTimestamp as ISO string', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.metadata.creationTimestamp).toBeDefined()
            expect(typeof pod.metadata.creationTimestamp).toBe('string')
            
            // Verify it's a valid ISO date string
            const date = new Date(pod.metadata.creationTimestamp)
            expect(date.toISOString()).toBe(pod.metadata.creationTimestamp)
        })

        it('should accept optional creationTimestamp', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const timestamp = '2025-01-01T00:00:00.000Z'
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
                creationTimestamp: timestamp,
            })

            expect(pod.metadata.creationTimestamp).toBe(timestamp)
        })

        it('should create immutable pod object', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            // Attempting to modify should not affect the original
            const originalName = pod.metadata.name
            
            // TypeScript will prevent this, but testing runtime immutability
            expect(() => {
                ;(pod as any).metadata.name = 'modified'
            }).toThrow()

            expect(pod.metadata.name).toBe(originalName)
        })

        it('should support multiple containers', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
                {
                    name: 'sidecar',
                    image: 'sidecar:1.0',
                    ports: [{ containerPort: 8080 }],
                },
            ]

            const pod = createPod({
                name: 'multi-container-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers).toHaveLength(2)
            expect(pod.spec.containers[0].name).toBe('nginx')
            expect(pod.spec.containers[1].name).toBe('sidecar')
        })
    })
})


