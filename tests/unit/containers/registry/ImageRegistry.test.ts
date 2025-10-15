import { describe, it, expect } from 'vitest'
import { createImageRegistry } from '../../../../src/containers/registry/ImageRegistry'

describe('ImageRegistry', () => {
    describe('parseImageString', () => {
        it('should parse simple image name with default registry and tag', () => {
            const registry = createImageRegistry()
            const result = registry.parseImageString('nginx')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data.name).toBe('nginx')
                expect(result.data.registry).toBe('docker.io/library')
                expect(result.data.tag).toBe('latest')
            }
        })

        it('should parse image name with tag', () => {
            const registry = createImageRegistry()
            const result = registry.parseImageString('nginx:1.25')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data.name).toBe('nginx')
                expect(result.data.registry).toBe('docker.io/library')
                expect(result.data.tag).toBe('1.25')
            }
        })

        it('should parse full image reference with custom registry', () => {
            const registry = createImageRegistry()
            const result = registry.parseImageString('myregistry.io/broken-app:v1.0')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data.name).toBe('broken-app')
                expect(result.data.registry).toBe('myregistry.io')
                expect(result.data.tag).toBe('v1.0')
            }
        })

        it('should parse registry with namespace', () => {
            const registry = createImageRegistry()
            const result = registry.parseImageString('private.registry.io/broken-app:latest')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data.name).toBe('broken-app')
                expect(result.data.registry).toBe('private.registry.io')
                expect(result.data.tag).toBe('latest')
            }
        })

        it('should reject empty image string', () => {
            const registry = createImageRegistry()
            const result = registry.parseImageString('')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('Image name cannot be empty')
            }
        })

        it('should reject invalid image format', () => {
            const registry = createImageRegistry()
            const result = registry.parseImageString('::invalid::')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('Invalid image format')
            }
        })
    })

    describe('validateImage', () => {
        it('should validate known image with default tag', () => {
            const registry = createImageRegistry()
            const result = registry.validateImage('nginx')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data.name).toBe('nginx')
                expect(result.data.tags).toContain('latest')
            }
        })

        it('should validate known image with specific tag', () => {
            const registry = createImageRegistry()
            const result = registry.validateImage('nginx:1.25')

            expect(result.type).toBe('success')
        })

        it('should reject unknown image', () => {
            const registry = createImageRegistry()
            const result = registry.validateImage('unknown-image:latest')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('Image not found in registry')
                expect(result.message).toContain("Run 'debug images'")
            }
        })

        it('should reject invalid tag for known image', () => {
            const registry = createImageRegistry()
            const result = registry.validateImage('nginx:9.99')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain("Tag '9.99' not found for nginx")
                expect(result.message).toContain('Available tags:')
            }
        })
    })

    describe('getImage', () => {
        it('should get image by name with default tag', () => {
            const registry = createImageRegistry()
            const result = registry.getImage('nginx')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data.name).toBe('nginx')
                expect(result.data.defaultPorts).toContain(80)
            }
        })

        it('should get image by name and specific tag', () => {
            const registry = createImageRegistry()
            const result = registry.getImage('nginx', '1.25')

            expect(result.type).toBe('success')
        })

        it('should return error for unknown image', () => {
            const registry = createImageRegistry()
            const result = registry.getImage('unknown')

            expect(result.type).toBe('error')
        })
    })

    describe('listAllImages', () => {
        it('should return all available images', () => {
            const registry = createImageRegistry()
            const images = registry.listAllImages()

            expect(images.length).toBeGreaterThanOrEqual(7)
            expect(images.some((img) => img.name === 'nginx')).toBe(true)
            expect(images.some((img) => img.name === 'redis')).toBe(true)
            expect(images.some((img) => img.name === 'postgres')).toBe(true)
            expect(images.some((img) => img.name === 'broken-app')).toBe(true)
        })

        it('should return images with all required fields', () => {
            const registry = createImageRegistry()
            const images = registry.listAllImages()

            images.forEach((img) => {
                expect(img.name).toBeDefined()
                expect(img.registry).toBeDefined()
                expect(img.tags).toBeDefined()
                expect(img.description).toBeDefined()
                expect(img.defaultPorts).toBeDefined()
                expect(img.behavior).toBeDefined()
                expect(img.behavior.startupTime).toBeDefined()
                expect(img.behavior.defaultStatus).toBeDefined()
            })
        })
    })
})

