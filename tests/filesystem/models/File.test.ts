import { describe, expect, it } from 'vitest'
import {
    createFile,
    getFileExtension,
} from '../../../src/filesystem/models/File'

describe('File Model', () => {
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

        it('should allow any file extension', () => {
            const txtFile = createFile('readme.txt', '/readme.txt')
            expect(txtFile.name).toBe('readme.txt')
            expect(txtFile.extension).toBe('.txt')

            const noExtFile = createFile('README', '/README')
            expect(noExtFile.name).toBe('README')
            expect(noExtFile.extension).toBe('')
        })
    })
})

