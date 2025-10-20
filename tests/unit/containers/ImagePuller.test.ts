import { describe, it, expect } from 'vitest'
import { simulateImagePull } from '../../../src/containers/ImagePuller'
import { createImageRegistry } from '../../../src/containers/registry/ImageRegistry'

describe('ImagePuller', () => {
    describe('simulateImagePull', () => {
        it('should successfully pull nginx image', () => {
            const registry = createImageRegistry()
            const result = simulateImagePull('nginx', registry)

            expect(result.ok).toBe(true)
            expect(result.status).toBe('Running')
            if (result.ok) {
                expect(result.events).toBeDefined()
            }
            if (result.ok) {
                expect(result.events!.length).toBeGreaterThan(0)
            }
        })

        it('should generate pull events in correct order', () => {
            const registry = createImageRegistry()
            const result = simulateImagePull('nginx:latest', registry)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.events[0].event).toBe('Pulling')
                expect(result.events[1].event).toBe('Pulled')
                expect(result.events[2].event).toBe('Created')
                expect(result.events[3].event).toBe('Started')
            }
        })

        it('should successfully pull redis image', () => {
            const registry = createImageRegistry()
            const result = simulateImagePull('redis:latest', registry)

            expect(result.ok).toBe(true)
            expect(result.status).toBe('Running')
        })

        it('should successfully pull postgres image', () => {
            const registry = createImageRegistry()
            const result = simulateImagePull('postgres', registry)

            expect(result.ok).toBe(true)
            expect(result.status).toBe('Running')
        })

        it('should return ImagePullBackOff for unknown image', () => {
            const registry = createImageRegistry()
            const result = simulateImagePull('unknown-image:latest', registry)

            expect(result.ok).toBe(false)
            expect(result.status).toBe('Pending')
            if (!result.ok) {
                expect(result.error).toContain('Failed to pull image')
                expect(result.error).toContain('Image not found in registry')
            }
        })

        it('should return Failed status for broken-app', () => {
            const registry = createImageRegistry()
            const result = simulateImagePull('myregistry.io/broken-app:v1.0', registry)

            expect(result.ok).toBe(true)
            expect(result.status).toBe('Failed')
            if (result.ok) {
                expect(result.events).toBeDefined()
            }
        })

        it('should return Succeeded status for busybox', () => {
            const registry = createImageRegistry()
            const result = simulateImagePull('busybox', registry)

            expect(result.ok).toBe(true)
            expect(result.status).toBe('Succeeded')
        })

        it('should return ImagePullBackOff for private-image', () => {
            const registry = createImageRegistry()
            const result = simulateImagePull('private.registry.io/private-image:latest', registry)

            expect(result.ok).toBe(true)
            expect(result.status).toBe('Pending')
        })

        it('should include image reference in events', () => {
            const registry = createImageRegistry()
            const result = simulateImagePull('nginx:1.25', registry)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.events[0].message).toContain('nginx')
            }
        })

        it('should handle invalid image format gracefully', () => {
            const registry = createImageRegistry()
            const result = simulateImagePull('', registry)

            expect(result.ok).toBe(false)
            expect(result.status).toBe('Pending')
        })
    })
})

