import { describe, it, expect, beforeEach } from 'vitest'
import { handleLabel } from '../../../../../src/kubectl/commands/handlers/label'
import type { ClusterStateData } from '../../../../../src/cluster/ClusterState'
import type { ParsedCommand } from '../../../../../src/kubectl/commands/types'
import { createPod } from '../../../../../src/cluster/ressources/Pod'
import { createConfigMap } from '../../../../../src/cluster/ressources/ConfigMap'
import { createSecret } from '../../../../../src/cluster/ressources/Secret'

describe('handleLabel', () => {
    let state: ClusterStateData

    beforeEach(() => {
        state = {
            pods: { items: [] },
            configMaps: { items: [] },
            secrets: { items: [] },
        }
    })

    // ─── Error Handling ──────────────────────────────────────────────────

    describe('error handling', () => {
        it('should return error when resource name is missing', () => {
            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                flags: {},
                labelChanges: { app: 'nginx' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Resource name is required')
            }
        })

        it('should return error when no label changes provided', () => {
            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('No label changes provided')
            }
        })

        it('should return error when label changes is empty object', () => {
            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: {},
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('No label changes provided')
            }
        })

        it('should return error when pod not found', () => {
            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nonexistent',
                flags: {},
                labelChanges: { app: 'nginx' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not found')
                expect(result.error).toContain('nonexistent')
            }
        })

        it('should return error when pod in wrong namespace', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                namespace: 'kube-system',
                flags: {},
                labelChanges: { app: 'web' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not found')
                expect(result.error).toContain('kube-system')
            }
        })

        it('should return error when trying to update label without --overwrite', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    labels: { app: 'existing' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { app: 'new' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('already exists')
                expect(result.error).toContain('overwrite')
            }
        })

        it('should return error for unsupported resource type', () => {
            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'deployments',
                name: 'my-deploy',
                flags: {},
                labelChanges: { app: 'web' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not supported')
                expect(result.error).toContain('deployments')
            }
        })
    })

    // ─── Pods ────────────────────────────────────────────────────────────

    describe('pods', () => {
        it('should add single label to pod', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { app: 'web' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('pod/nginx labeled')
                expect(result.state).toBeDefined()
                if (result.state) {
                    const pod = result.state.pods.items[0]
                    expect(pod.metadata.labels).toEqual({ app: 'web' })
                }
            }
        })

        it('should add multiple labels to pod', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { app: 'web', tier: 'frontend', environment: 'prod' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.labels).toEqual({
                    app: 'web',
                    tier: 'frontend',
                    environment: 'prod',
                })
            }
        })

        it('should add labels to pod with existing labels', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    labels: { existing: 'label' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { app: 'web' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.labels).toEqual({
                    existing: 'label',
                    app: 'web',
                })
            }
        })

        it('should update label with --overwrite flag', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    labels: { app: 'old' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: { overwrite: true },
                labelChanges: { app: 'new' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.labels).toEqual({ app: 'new' })
            }
        })

        it('should remove single label', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    labels: { app: 'web', tier: 'frontend' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { app: null },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.labels).toEqual({ tier: 'frontend' })
            }
        })

        it('should remove multiple labels', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    labels: { app: 'web', tier: 'frontend', env: 'prod' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { app: null, tier: null },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.labels).toEqual({ env: 'prod' })
            }
        })

        it('should remove all labels when removing last one', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    labels: { app: 'web' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { app: null },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.labels).toBeUndefined()
            }
        })

        it('should handle mixed add and remove operations', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    labels: { app: 'web', old: 'value' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { tier: 'frontend', old: null },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.labels).toEqual({
                    app: 'web',
                    tier: 'frontend',
                })
            }
        })

        it('should handle removal of non-existent label gracefully', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    labels: { app: 'web' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { nonexistent: null },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.labels).toEqual({ app: 'web' })
            }
        })

        it('should label pod in specific namespace', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'kube-system',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                namespace: 'kube-system',
                flags: {},
                labelChanges: { app: 'web' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.labels).toEqual({ app: 'web' })
            }
        })

        it('should not modify other pods when labeling one pod', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
                createPod({
                    name: 'redis',
                    namespace: 'default',
                    containers: [{ name: 'redis', image: 'redis:latest' }],
                    labels: { app: 'redis' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { app: 'web' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                expect(result.state.pods.items).toHaveLength(2)
                const nginx = result.state.pods.items.find((p) => p.metadata.name === 'nginx')
                const redis = result.state.pods.items.find((p) => p.metadata.name === 'redis')
                expect(nginx?.metadata.labels).toEqual({ app: 'web' })
                expect(redis?.metadata.labels).toEqual({ app: 'redis' })
            }
        })
    })

    // ─── ConfigMaps ──────────────────────────────────────────────────────

    describe('configmaps', () => {
        it('should add label to configmap', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'my-config',
                    namespace: 'default',
                    data: { key: 'value' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'configmaps',
                name: 'my-config',
                flags: {},
                labelChanges: { version: '1.0' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('configmap/my-config labeled')
                if (result.state) {
                    const cm = result.state.configMaps.items[0]
                    expect(cm.metadata.labels).toEqual({ version: '1.0' })
                }
            }
        })

        it('should remove label from configmap', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'my-config',
                    namespace: 'default',
                    data: { key: 'value' },
                    labels: { version: '1.0', env: 'prod' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'configmaps',
                name: 'my-config',
                flags: {},
                labelChanges: { version: null },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const cm = result.state.configMaps.items[0]
                expect(cm.metadata.labels).toEqual({ env: 'prod' })
            }
        })

        it('should return error when configmap not found', () => {
            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'configmaps',
                name: 'nonexistent',
                flags: {},
                labelChanges: { app: 'test' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('ConfigMap')
                expect(result.error).toContain('not found')
            }
        })
    })

    // ─── Secrets ─────────────────────────────────────────────────────────

    describe('secrets', () => {
        it('should add label to secret', () => {
            state.secrets.items = [
                createSecret({
                    name: 'db-secret',
                    namespace: 'default',
                    type: { type: 'Opaque' },
                    data: { password: 'secret' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'secrets',
                name: 'db-secret',
                flags: {},
                labelChanges: { app: 'database' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('secret/db-secret labeled')
                if (result.state) {
                    const secret = result.state.secrets.items[0]
                    expect(secret.metadata.labels).toEqual({ app: 'database' })
                }
            }
        })

        it('should remove label from secret', () => {
            state.secrets.items = [
                createSecret({
                    name: 'db-secret',
                    namespace: 'default',
                    type: { type: 'Opaque' },
                    data: { password: 'secret' },
                    labels: { app: 'database', env: 'prod' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'secrets',
                name: 'db-secret',
                flags: {},
                labelChanges: { app: null },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const secret = result.state.secrets.items[0]
                expect(secret.metadata.labels).toEqual({ env: 'prod' })
            }
        })

        it('should return error when secret not found', () => {
            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'secrets',
                name: 'nonexistent',
                flags: {},
                labelChanges: { app: 'test' },
            }

            const result = handleLabel(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Secret')
                expect(result.error).toContain('not found')
            }
        })
    })

    // ─── Immutability ────────────────────────────────────────────────────

    describe('immutability', () => {
        it('should not modify original state', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const originalPod = state.pods.items[0]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { app: 'web' },
            }

            handleLabel(state, parsed)

            // Original state should not be modified
            expect(state.pods.items[0]).toBe(originalPod)
            expect(state.pods.items[0].metadata.labels).toBeUndefined()
        })

        it('should return frozen resource', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'label',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                labelChanges: { app: 'web' },
            }

            const result = handleLabel(state, parsed)

            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(Object.isFrozen(pod)).toBe(true)
            }
        })
    })
})

