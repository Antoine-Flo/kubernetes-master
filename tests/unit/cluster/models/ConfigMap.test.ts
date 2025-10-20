import { describe, it, expect } from 'vitest'
import { createConfigMap } from '../../../../src/cluster/models/ConfigMap'

describe('ConfigMap Model', () => {
    describe('createConfigMap', () => {
        it('should create a configmap with data field', () => {
            const configMap = createConfigMap({
                name: 'app-config',
                namespace: 'default',
                data: {
                    'app.properties': 'key=value\nfoo=bar',
                    'database.url': 'postgres://localhost:5432',
                },
            })

            expect(configMap).toBeDefined()
            expect(configMap.metadata.name).toBe('app-config')
            expect(configMap.metadata.namespace).toBe('default')
            expect(configMap.data).toEqual({
                'app.properties': 'key=value\nfoo=bar',
                'database.url': 'postgres://localhost:5432',
            })
            expect(configMap.binaryData).toBeUndefined()
        })

        it('should create a configmap with binaryData field', () => {
            const configMap = createConfigMap({
                name: 'binary-config',
                namespace: 'default',
                binaryData: {
                    'cert.pem': 'YmFzZTY0ZW5jb2RlZA==',
                },
            })

            expect(configMap.binaryData).toEqual({
                'cert.pem': 'YmFzZTY0ZW5jb2RlZA==',
            })
            expect(configMap.data).toBeUndefined()
        })

        it('should create a configmap with both data and binaryData', () => {
            const configMap = createConfigMap({
                name: 'mixed-config',
                namespace: 'default',
                data: {
                    'config.txt': 'text data',
                },
                binaryData: {
                    'binary.dat': 'YmluYXJ5',
                },
            })

            expect(configMap.data).toEqual({ 'config.txt': 'text data' })
            expect(configMap.binaryData).toEqual({ 'binary.dat': 'YmluYXJ5' })
        })

        it('should set default values correctly', () => {
            const configMap = createConfigMap({
                name: 'test-config',
                namespace: 'default',
                data: { key: 'value' },
            })

            expect(configMap.apiVersion).toBe('v1')
            expect(configMap.kind).toBe('ConfigMap')
            expect(configMap.metadata.creationTimestamp).toBeDefined()
        })

        it('should accept optional labels', () => {
            const labels = { app: 'web', env: 'prod' }
            const configMap = createConfigMap({
                name: 'test-config',
                namespace: 'default',
                data: { key: 'value' },
                labels,
            })

            expect(configMap.metadata.labels).toEqual(labels)
        })

        it('should create configmap without labels when not provided', () => {
            const configMap = createConfigMap({
                name: 'test-config',
                namespace: 'default',
                data: { key: 'value' },
            })

            expect(configMap.metadata.labels).toBeUndefined()
        })

        it('should set creationTimestamp as ISO string', () => {
            const configMap = createConfigMap({
                name: 'test-config',
                namespace: 'default',
                data: { key: 'value' },
            })

            expect(configMap.metadata.creationTimestamp).toBeDefined()
            expect(typeof configMap.metadata.creationTimestamp).toBe('string')

            // Verify it's a valid ISO date string
            const date = new Date(configMap.metadata.creationTimestamp)
            expect(date.toISOString()).toBe(configMap.metadata.creationTimestamp)
        })

        it('should accept optional creationTimestamp', () => {
            const timestamp = '2025-01-01T00:00:00.000Z'
            const configMap = createConfigMap({
                name: 'test-config',
                namespace: 'default',
                data: { key: 'value' },
                creationTimestamp: timestamp,
            })

            expect(configMap.metadata.creationTimestamp).toBe(timestamp)
        })

        it('should create immutable configmap object', () => {
            const configMap = createConfigMap({
                name: 'test-config',
                namespace: 'default',
                data: { key: 'value' },
            })

            const originalName = configMap.metadata.name

            // TypeScript will prevent this, but testing runtime immutability
            expect(() => {
                ; (configMap as any).metadata.name = 'modified'
            }).toThrow()

            expect(configMap.metadata.name).toBe(originalName)
        })

        it('should handle empty data object', () => {
            const configMap = createConfigMap({
                name: 'empty-config',
                namespace: 'default',
                data: {},
            })

            expect(configMap.data).toEqual({})
        })
    })
})

