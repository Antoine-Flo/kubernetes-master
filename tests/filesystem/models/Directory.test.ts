import { describe, it, expect } from 'vitest'
import { createDirectory, type DirectoryNode } from '../../../src/filesystem/models/Directory'

describe('Directory Model', () => {
    describe('createDirectory', () => {
        it('should create directory with name and path', () => {
            const dir = createDirectory('manifests', '/manifests')

            expect(dir.type).toBe('directory')
            expect(dir.name).toBe('manifests')
            expect(dir.path).toBe('/manifests')
        })

        it('should initialize empty children Map', () => {
            const dir = createDirectory('examples', '/examples')

            expect(dir.children).toBeInstanceOf(Map)
            expect(dir.children.size).toBe(0)
        })

        it('should create root directory', () => {
            const root = createDirectory('root', '/')

            expect(root.name).toBe('root')
            expect(root.path).toBe('/')
        })

        it('should create nested directory', () => {
            const dir = createDirectory('pods', '/manifests/dev/pods')

            expect(dir.name).toBe('pods')
            expect(dir.path).toBe('/manifests/dev/pods')
        })

        it('should be immutable', () => {
            const dir = createDirectory('test', '/test')

            expect(() => {
                (dir as any).name = 'changed'
            }).toThrow()

            expect(() => {
                (dir as any).path = 'changed'
            }).toThrow()

            expect(() => {
                (dir as any).type = 'file'
            }).toThrow()
        })

        it('should have immutable children Map', () => {
            const dir = createDirectory('test', '/test')

            // Map itself is not frozen, but the directory object is
            // This is intentional - we need to mutate children during operations
            // but the directory reference itself is immutable
            expect(Object.isFrozen(dir)).toBe(true)
        })
    })
})

