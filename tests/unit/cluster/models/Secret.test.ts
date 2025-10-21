import { describe, it, expect } from 'vitest'
import {
    createSecret,
    encodeBase64,
    decodeBase64,
} from '../../../../src/cluster/ressources/Secret'

describe('Secret Model', () => {
    describe('createSecret', () => {
        it('should create an Opaque secret', () => {
            const secret = createSecret({
                name: 'db-password',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: {
                    username: 'YWRtaW4=', // base64: admin
                    password: 'cGFzc3dvcmQxMjM=', // base64: password123
                },
            })

            expect(secret).toBeDefined()
            expect(secret.metadata.name).toBe('db-password')
            expect(secret.metadata.namespace).toBe('default')
            expect(secret.type).toEqual({ type: 'Opaque' })
            expect(secret.data).toEqual({
                username: 'YWRtaW4=',
                password: 'cGFzc3dvcmQxMjM=',
            })
        })

        it('should create a service account token secret', () => {
            const secret = createSecret({
                name: 'sa-token',
                namespace: 'default',
                secretType: {
                    type: 'kubernetes.io/service-account-token',
                    serviceAccountName: 'default-sa',
                },
                data: {
                    token: 'dG9rZW4xMjM=',
                },
            })

            expect(secret.type).toEqual({
                type: 'kubernetes.io/service-account-token',
                serviceAccountName: 'default-sa',
            })
        })

        it('should create a docker config json secret', () => {
            const secret = createSecret({
                name: 'docker-registry',
                namespace: 'default',
                secretType: {
                    type: 'kubernetes.io/dockerconfigjson',
                    dockerConfigJson: 'eyJhdXRocyI6e319', // base64: {"auths":{}}
                },
                data: {
                    '.dockerconfigjson': 'eyJhdXRocyI6e319',
                },
            })

            expect(secret.type).toEqual({
                type: 'kubernetes.io/dockerconfigjson',
                dockerConfigJson: 'eyJhdXRocyI6e319',
            })
        })

        it('should set default values correctly', () => {
            const secret = createSecret({
                name: 'test-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: { key: 'dmFsdWU=' },
            })

            expect(secret.apiVersion).toBe('v1')
            expect(secret.kind).toBe('Secret')
            expect(secret.metadata.creationTimestamp).toBeDefined()
        })

        it('should accept optional labels', () => {
            const labels = { app: 'web', env: 'prod' }
            const secret = createSecret({
                name: 'test-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: { key: 'dmFsdWU=' },
                labels,
            })

            expect(secret.metadata.labels).toEqual(labels)
        })

        it('should create secret without labels when not provided', () => {
            const secret = createSecret({
                name: 'test-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: { key: 'dmFsdWU=' },
            })

            expect(secret.metadata.labels).toBeUndefined()
        })

        it('should set creationTimestamp as ISO string', () => {
            const secret = createSecret({
                name: 'test-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: { key: 'dmFsdWU=' },
            })

            expect(secret.metadata.creationTimestamp).toBeDefined()
            expect(typeof secret.metadata.creationTimestamp).toBe('string')

            const date = new Date(secret.metadata.creationTimestamp)
            expect(date.toISOString()).toBe(secret.metadata.creationTimestamp)
        })

        it('should accept optional creationTimestamp', () => {
            const timestamp = '2025-01-01T00:00:00.000Z'
            const secret = createSecret({
                name: 'test-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: { key: 'dmFsdWU=' },
                creationTimestamp: timestamp,
            })

            expect(secret.metadata.creationTimestamp).toBe(timestamp)
        })

        it('should create immutable secret object', () => {
            const secret = createSecret({
                name: 'test-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: { key: 'dmFsdWU=' },
            })

            const originalName = secret.metadata.name

            expect(() => {
                ; (secret as any).metadata.name = 'modified'
            }).toThrow()

            expect(secret.metadata.name).toBe(originalName)
        })

        it('should handle empty data object', () => {
            const secret = createSecret({
                name: 'empty-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: {},
            })

            expect(secret.data).toEqual({})
        })
    })

    describe('encodeBase64', () => {
        it('should encode string to base64', () => {
            expect(encodeBase64('admin')).toBe('YWRtaW4=')
            expect(encodeBase64('password123')).toBe('cGFzc3dvcmQxMjM=')
        })

        it('should handle empty string', () => {
            expect(encodeBase64('')).toBe('')
        })

        it('should handle special characters', () => {
            expect(encodeBase64('hello@world!')).toBe('aGVsbG9Ad29ybGQh')
        })
    })

    describe('decodeBase64', () => {
        it('should decode base64 to string', () => {
            expect(decodeBase64('YWRtaW4=')).toBe('admin')
            expect(decodeBase64('cGFzc3dvcmQxMjM=')).toBe('password123')
        })

        it('should handle empty string', () => {
            expect(decodeBase64('')).toBe('')
        })

        it('should handle special characters', () => {
            expect(decodeBase64('aGVsbG9Ad29ybGQh')).toBe('hello@world!')
        })
    })
})

