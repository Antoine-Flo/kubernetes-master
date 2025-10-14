import { describe, it, expect } from 'vitest'
import {
    createFile,
    getFileExtension,
    getSupportedExtensions,
    isValidExtension,
    type FileNode
} from '../../../src/filesystem/models/File'

describe('File Model', () => {
    describe('getSupportedExtensions', () => {
        it('should return array of supported extensions', () => {
            const extensions = getSupportedExtensions()
            expect(extensions).toContain('.yaml')
            expect(extensions).toContain('.yml')
            expect(extensions).toContain('.json')
            expect(extensions).toContain('.kyaml')
        })

        it('should be immutable', () => {
            const extensions = getSupportedExtensions()
            expect(() => {
                (extensions as any).push('.txt')
            }).toThrow()
        })
    })

    describe('getFileExtension', () => {
        it('should extract extension from filename', () => {
            expect(getFileExtension('pod.yaml')).toBe('.yaml')
            expect(getFileExtension('deployment.yml')).toBe('.yml')
            expect(getFileExtension('service.json')).toBe('.json')
            expect(getFileExtension('config.kyaml')).toBe('.kyaml')
        })

        it('should handle filenames with multiple dots', () => {
            expect(getFileExtension('my.pod.yaml')).toBe('.yaml')
            expect(getFileExtension('app.config.json')).toBe('.json')
        })

        it('should return empty string for no extension', () => {
            expect(getFileExtension('README')).toBe('')
        })

        it('should handle paths in filename', () => {
            expect(getFileExtension('/manifests/pod.yaml')).toBe('.yaml')
            expect(getFileExtension('manifests/dev/service.json')).toBe('.json')
        })
    })

    describe('isValidExtension', () => {
        it('should return true for supported extensions', () => {
            expect(isValidExtension('.yaml')).toBe(true)
            expect(isValidExtension('.yml')).toBe(true)
            expect(isValidExtension('.json')).toBe(true)
            expect(isValidExtension('.kyaml')).toBe(true)
        })

        it('should return false for unsupported extensions', () => {
            expect(isValidExtension('.txt')).toBe(false)
            expect(isValidExtension('.xml')).toBe(false)
            expect(isValidExtension('')).toBe(false)
        })

        it('should be case sensitive', () => {
            expect(isValidExtension('.YAML')).toBe(false)
            expect(isValidExtension('.Json')).toBe(false)
        })
    })

    describe('createFile', () => {
        it('should create file with valid yaml extension', () => {
            const file = createFile('pod.yaml', '/manifests/pod.yaml', 'apiVersion: v1')

            expect(file.type).toBe('file')
            expect(file.name).toBe('pod.yaml')
            expect(file.path).toBe('/manifests/pod.yaml')
            expect(file.content).toBe('apiVersion: v1')
            expect(file.extension).toBe('.yaml')
        })

        it('should create file with yml extension', () => {
            const file = createFile('deploy.yml', '/deploy.yml', '')
            expect(file.extension).toBe('.yml')
        })

        it('should create file with json extension', () => {
            const file = createFile('service.json', '/service.json', '{}')
            expect(file.extension).toBe('.json')
        })

        it('should create file with kyaml extension', () => {
            const file = createFile('config.kyaml', '/config.kyaml', '')
            expect(file.extension).toBe('.kyaml')
        })

        it('should set default empty content', () => {
            const file = createFile('pod.yaml', '/pod.yaml')
            expect(file.content).toBe('')
        })

        it('should set timestamps', () => {
            const before = new Date().toISOString()
            const file = createFile('pod.yaml', '/pod.yaml')
            const after = new Date().toISOString()

            expect(file.createdAt).toBeDefined()
            expect(file.modifiedAt).toBeDefined()
            expect(file.createdAt >= before).toBe(true)
            expect(file.createdAt <= after).toBe(true)
            expect(file.modifiedAt).toBe(file.createdAt)
        })

        it('should be immutable', () => {
            const file = createFile('pod.yaml', '/pod.yaml', 'content')

            expect(() => {
                (file as any).content = 'changed'
            }).toThrow()

            expect(() => {
                (file as any).name = 'changed'
            }).toThrow()
        })

        it('should throw error for unsupported extension', () => {
            expect(() => {
                createFile('readme.txt', '/readme.txt')
            }).toThrow('Unsupported file extension: .txt')
        })

        it('should throw error for no extension', () => {
            expect(() => {
                createFile('README', '/README')
            }).toThrow('Unsupported file extension: ')
        })
    })
})

