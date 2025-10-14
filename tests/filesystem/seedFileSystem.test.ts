import { describe, it, expect } from 'vitest'
import { createSeedFileSystem } from '../../src/filesystem/seedFileSystem'
import { findNode } from '../../src/filesystem/FileSystem'

describe('Seed FileSystem', () => {
    describe('createSeedFileSystem', () => {
        it('should create filesystem with root path', () => {
            const state = createSeedFileSystem()
            expect(state.currentPath).toBe('/')
        })

        it('should create root directory', () => {
            const state = createSeedFileSystem()
            expect(state.tree.type).toBe('directory')
            expect(state.tree.path).toBe('/')
        })

        it('should create examples directory', () => {
            const state = createSeedFileSystem()
            const examples = findNode(state.tree, '/examples')

            expect(examples).toBeDefined()
            expect(examples?.type).toBe('directory')
            expect(examples?.name).toBe('examples')
        })

        it('should create manifests directory', () => {
            const state = createSeedFileSystem()
            const manifests = findNode(state.tree, '/manifests')

            expect(manifests).toBeDefined()
            expect(manifests?.type).toBe('directory')
            expect(manifests?.name).toBe('manifests')
        })

        it('should create pod-example.yaml file', () => {
            const state = createSeedFileSystem()
            const file = findNode(state.tree, '/examples/pod-example.yaml')

            expect(file).toBeDefined()
            expect(file?.type).toBe('file')
            if (file?.type === 'file') {
                expect(file.name).toBe('pod-example.yaml')
                expect(file.extension).toBe('.yaml')
                expect(file.content).toContain('apiVersion: v1')
                expect(file.content).toContain('kind: Pod')
            }
        })

        it('should create deployment-example.yml file', () => {
            const state = createSeedFileSystem()
            const file = findNode(state.tree, '/examples/deployment-example.yml')

            expect(file).toBeDefined()
            expect(file?.type).toBe('file')
            if (file?.type === 'file') {
                expect(file.name).toBe('deployment-example.yml')
                expect(file.extension).toBe('.yml')
                expect(file.content).toContain('apiVersion: apps/v1')
                expect(file.content).toContain('kind: Deployment')
            }
        })

        it('should create service-example.json file', () => {
            const state = createSeedFileSystem()
            const file = findNode(state.tree, '/examples/service-example.json')

            expect(file).toBeDefined()
            expect(file?.type).toBe('file')
            if (file?.type === 'file') {
                expect(file.name).toBe('service-example.json')
                expect(file.extension).toBe('.json')
                expect(file.content).toContain('"apiVersion": "v1"')
                expect(file.content).toContain('"kind": "Service"')
            }
        })

        it('should have empty manifests directory', () => {
            const state = createSeedFileSystem()
            const manifests = findNode(state.tree, '/manifests')

            expect(manifests).toBeDefined()
            if (manifests?.type === 'directory') {
                expect(manifests.children.size).toBe(0)
            }
        })

        it('should be immutable', () => {
            const state = createSeedFileSystem()

            expect(Object.isFrozen(state.tree)).toBe(true)
        })

        it('should create new instance each time', () => {
            const state1 = createSeedFileSystem()
            const state2 = createSeedFileSystem()

            expect(state1).not.toBe(state2)
            expect(state1.tree).not.toBe(state2.tree)
        })
    })
})

