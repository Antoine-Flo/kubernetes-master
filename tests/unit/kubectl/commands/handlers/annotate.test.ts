import { beforeEach, describe, expect, it } from 'vitest'
import type { ClusterStateData } from '../../../../../src/cluster/ClusterState'
import { createEventBus } from '../../../../../src/cluster/events/EventBus'
import { createConfigMap } from '../../../../../src/cluster/ressources/ConfigMap'
import { createPod } from '../../../../../src/cluster/ressources/Pod'
import { createSecret } from '../../../../../src/cluster/ressources/Secret'
import { handleAnnotate } from '../../../../../src/kubectl/commands/handlers/annotate'
import type { ParsedCommand } from '../../../../../src/kubectl/commands/types'

describe('handleAnnotate', () => {
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
                action: 'annotate',
                resource: 'pods',
                flags: {},
                annotationChanges: { description: 'test' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('must specify the name')
            }
        })

        it('should return error when no annotation changes provided', () => {
            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('No annotation changes provided')
            }
        })

        it('should return error when annotation changes is empty object', () => {
            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: {},
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('No annotation changes provided')
            }
        })

        it('should return error when pod not found', () => {
            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nonexistent',
                flags: {},
                annotationChanges: { description: 'test' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
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
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                namespace: 'kube-system',
                flags: {},
                annotationChanges: { description: 'test' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Error from server (NotFound)')
                expect(result.error).toContain('not found')
            }
        })

        it('should return error when trying to update annotation without --overwrite', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    annotations: { description: 'existing' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { description: 'new' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('already exists')
                expect(result.error).toContain('overwrite')
            }
        })

        it('should return error for unsupported resource type', () => {
            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'deployments',
                name: 'my-deploy',
                flags: {},
                annotationChanges: { description: 'test' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not supported')
                expect(result.error).toContain('deployments')
            }
        })
    })

    // ─── Pods ────────────────────────────────────────────────────────────

    describe('pods', () => {
        it('should add single annotation to pod', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { description: 'Web server' },
            }

            const eventBus = createEventBus()
            const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('pod/nginx annotated')
                // Event-driven: no state returned, event is emitted
                const history = eventBus.getHistory()
                expect(history).toHaveLength(1)
                expect(history[0].type).toBe('PodAnnotated')
            }
        })

        it('should add multiple annotations to pod', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: {
                    description: 'Web server',
                    owner: 'team-a',
                    version: '1.0.0',
                },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.annotations).toEqual({
                    description: 'Web server',
                    owner: 'team-a',
                    version: '1.0.0',
                })
            }
        })

        it('should add annotations to pod with existing annotations', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    annotations: { existing: 'annotation' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { description: 'Web server' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.annotations).toEqual({
                    existing: 'annotation',
                    description: 'Web server',
                })
            }
        })

        it('should update annotation with --overwrite flag', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    annotations: { description: 'old' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: { overwrite: true },
                annotationChanges: { description: 'new' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.annotations).toEqual({ description: 'new' })
            }
        })

        it('should remove single annotation', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    annotations: { description: 'Web server', owner: 'team-a' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { description: null },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.annotations).toEqual({ owner: 'team-a' })
            }
        })

        it('should remove multiple annotations', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    annotations: { description: 'Web', owner: 'team', version: '1.0' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { description: null, owner: null },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.annotations).toEqual({ version: '1.0' })
            }
        })

        it('should remove all annotations when removing last one', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    annotations: { description: 'Web server' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { description: null },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.annotations).toBeUndefined()
            }
        })

        it('should handle mixed add and remove operations', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    annotations: { description: 'Web', old: 'value' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { owner: 'team-a', old: null },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.annotations).toEqual({
                    description: 'Web',
                    owner: 'team-a',
                })
            }
        })

        it('should handle removal of non-existent annotation gracefully', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    annotations: { description: 'Web' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { nonexistent: null },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.annotations).toEqual({ description: 'Web' })
            }
        })

        it('should annotate pod in specific namespace', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'kube-system',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                namespace: 'kube-system',
                flags: {},
                annotationChanges: { description: 'System pod' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.annotations).toEqual({ description: 'System pod' })
            }
        })

        it('should not modify other pods when annotating one pod', () => {
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
                    annotations: { description: 'Cache' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { description: 'Web server' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                expect(result.state.pods.items).toHaveLength(2)
                const nginx = result.state.pods.items.find((p) => p.metadata.name === 'nginx')
                const redis = result.state.pods.items.find((p) => p.metadata.name === 'redis')
                expect(nginx?.metadata.annotations).toEqual({ description: 'Web server' })
                expect(redis?.metadata.annotations).toEqual({ description: 'Cache' })
            }
        })

        it('should handle annotation with URL value', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { docs: 'https://example.com/docs' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.annotations).toEqual({ docs: 'https://example.com/docs' })
            }
        })

        it('should handle annotation with long text value', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const longText = 'This is a very long annotation value with multiple words and punctuation!'

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { description: longText },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(pod.metadata.annotations).toEqual({ description: longText })
            }
        })
    })

    // ─── ConfigMaps ──────────────────────────────────────────────────────

    describe('configmaps', () => {
        it('should add annotation to configmap', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'my-config',
                    namespace: 'default',
                    data: { key: 'value' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'configmaps',
                name: 'my-config',
                flags: {},
                annotationChanges: { description: 'Application config' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('configmap/my-config annotated')
                if (result.state) {
                    const cm = result.state.configMaps.items[0]
                    expect(cm.metadata.annotations).toEqual({ description: 'Application config' })
                }
            }
        })

        it('should remove annotation from configmap', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'my-config',
                    namespace: 'default',
                    data: { key: 'value' },
                    annotations: { description: 'Config', owner: 'team' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'configmaps',
                name: 'my-config',
                flags: {},
                annotationChanges: { description: null },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const cm = result.state.configMaps.items[0]
                expect(cm.metadata.annotations).toEqual({ owner: 'team' })
            }
        })

        it('should return error when configmap not found', () => {
            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'configmaps',
                name: 'nonexistent',
                flags: {},
                annotationChanges: { description: 'test' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Error from server (NotFound)')
                expect(result.error).toContain('not found')
            }
        })
    })

    // ─── Secrets ─────────────────────────────────────────────────────────

    describe('secrets', () => {
        it('should add annotation to secret', () => {
            state.secrets.items = [
                createSecret({
                    name: 'db-secret',
                    namespace: 'default',
                    secretType: { type: 'Opaque' },
                    data: { password: 'secret' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'secrets',
                name: 'db-secret',
                flags: {},
                annotationChanges: { description: 'Database credentials' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('secret/db-secret annotated')
                if (result.state) {
                    const secret = result.state.secrets.items[0]
                    expect(secret.metadata.annotations).toEqual({ description: 'Database credentials' })
                }
            }
        })

        it('should remove annotation from secret', () => {
            state.secrets.items = [
                createSecret({
                    name: 'db-secret',
                    namespace: 'default',
                    secretType: { type: 'Opaque' },
                    data: { password: 'secret' },
                    annotations: { description: 'Creds', owner: 'admin' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'secrets',
                name: 'db-secret',
                flags: {},
                annotationChanges: { description: null },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(true)
            if (result.ok && result.state) {
                const secret = result.state.secrets.items[0]
                expect(secret.metadata.annotations).toEqual({ owner: 'admin' })
            }
        })

        it('should return error when secret not found', () => {
            const parsed: ParsedCommand = {
                action: 'annotate',
                resource: 'secrets',
                name: 'nonexistent',
                flags: {},
                annotationChanges: { description: 'test' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Error from server (NotFound)')
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
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { description: 'Web server' },
            }

            const eventBus = createEventBus()
            handleAnnotate(state, parsed, eventBus)

            // Original state should not be modified (events don't mutate input state)
            expect(state.pods.items[0]).toBe(originalPod)
            expect(state.pods.items[0].metadata.annotations).toBeUndefined()
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
                action: 'annotate',
                resource: 'pods',
                name: 'nginx',
                flags: {},
                annotationChanges: { description: 'Web server' },
            }

            const eventBus = createEventBus()
        const result = handleAnnotate(state, parsed, eventBus)

            if (result.ok && result.state) {
                const pod = result.state.pods.items[0]
                expect(Object.isFrozen(pod)).toBe(true)
            }
        })
    })
})

