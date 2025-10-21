import { describe, it, expect, beforeEach } from 'vitest'
import { handleGet } from '../../../../../src/kubectl/commands/handlers/get'
import type { ClusterStateData } from '../../../../../src/cluster/ClusterState'
import type { ParsedCommand } from '../../../../../src/kubectl/commands/types'
import { createPod } from '../../../../../src/cluster/ressources/Pod'
import { createConfigMap } from '../../../../../src/cluster/ressources/ConfigMap'
import { createSecret } from '../../../../../src/cluster/ressources/Secret'

describe('handleGet', () => {
    let state: ClusterStateData

    beforeEach(() => {
        // Create empty state
        state = {
            pods: { items: [] },
            configMaps: { items: [] },
            secrets: { items: [] },
        }
    })

    // ─── Pods ────────────────────────────────────────────────────────────

    describe('pods', () => {
        it('should list pods in default namespace', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx-pod',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest', ports: [] }],
                    creationTimestamp: new Date('2025-10-17T10:00:00Z').toISOString(),
                    phase: 'Running',
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'pods',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('NAME')
            expect(output).toContain('STATUS')
            expect(output).toContain('AGE')
            expect(output).toContain('nginx-pod')
            expect(output).toContain('Running')
        })

        it('should filter pods by namespace with -n flag', () => {
            state.pods.items = [
                createPod({
                    name: 'default-pod',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest', ports: [] }],
                }),
                createPod({
                    name: 'kube-system-pod',
                    namespace: 'kube-system',
                    containers: [{ name: 'coredns', image: 'coredns:latest', ports: [] }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'pods',
                namespace: 'kube-system',
                flags: { n: 'kube-system' },
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('kube-system-pod')
            expect(output).not.toContain('default-pod')
        })

        it('should filter pods by single label', () => {
            state.pods.items = [
                createPod({
                    name: 'app-pod',
                    namespace: 'default',
                    labels: { app: 'nginx' },
                    containers: [{ name: 'nginx', image: 'nginx:latest', ports: [] }],
                }),
                createPod({
                    name: 'db-pod',
                    namespace: 'default',
                    labels: { app: 'redis' },
                    containers: [{ name: 'redis', image: 'redis:latest', ports: [] }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'pods',
                selector: { app: 'nginx' },
                flags: { l: 'app=nginx' },
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('app-pod')
            expect(output).not.toContain('db-pod')
        })

        it('should filter pods by multiple labels', () => {
            state.pods.items = [
                createPod({
                    name: 'prod-app',
                    namespace: 'default',
                    labels: { app: 'nginx', env: 'prod' },
                    containers: [{ name: 'nginx', image: 'nginx:latest', ports: [] }],
                }),
                createPod({
                    name: 'dev-app',
                    namespace: 'default',
                    labels: { app: 'nginx', env: 'dev' },
                    containers: [{ name: 'nginx', image: 'nginx:latest', ports: [] }],
                }),
                createPod({
                    name: 'prod-db',
                    namespace: 'default',
                    labels: { app: 'redis', env: 'prod' },
                    containers: [{ name: 'redis', image: 'redis:latest', ports: [] }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'pods',
                selector: { app: 'nginx', env: 'prod' },
                flags: { l: 'app=nginx,env=prod' },
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('prod-app')
            expect(output).not.toContain('dev-app')
            expect(output).not.toContain('prod-db')
        })

        it('should return "No resources found" when no pods exist', () => {
            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'pods',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toBe('No resources found')
        })

        it('should return "No resources found" when namespace filter matches nothing', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx-pod',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest', ports: [] }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'pods',
                namespace: 'nonexistent',
                flags: { n: 'nonexistent' },
            }

            const output = handleGet(state, parsed)
            expect(output).toBe('No resources found')
        })

        it('should return "No resources found" when label filter matches nothing', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx-pod',
                    namespace: 'default',
                    labels: { app: 'nginx' },
                    containers: [{ name: 'nginx', image: 'nginx:latest', ports: [] }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'pods',
                selector: { app: 'redis' },
                flags: { l: 'app=redis' },
            }

            const output = handleGet(state, parsed)
            expect(output).toBe('No resources found')
        })
    })

    // ─── ConfigMaps ──────────────────────────────────────────────────────

    describe('configmaps', () => {
        it('should list configmaps with DATA count', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'app-config',
                    namespace: 'default',
                    data: { key1: 'value1', key2: 'value2', key3: 'value3' },
                    creationTimestamp: new Date('2025-10-17T10:00:00Z').toISOString(),
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'configmaps',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('NAME')
            expect(output).toContain('DATA')
            expect(output).toContain('AGE')
            expect(output).toContain('app-config')
            expect(output).toContain('3')
        })

        it('should show 0 for configmap with no data', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'empty-config',
                    namespace: 'default',
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'configmaps',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('empty-config')
            expect(output).toContain('0')
        })

        it('should filter configmaps by namespace', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'default-config',
                    namespace: 'default',
                    data: { key: 'value' },
                }),
                createConfigMap({
                    name: 'kube-system-config',
                    namespace: 'kube-system',
                    data: { key: 'value' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'configmaps',
                namespace: 'kube-system',
                flags: { n: 'kube-system' },
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('kube-system-config')
            expect(output).not.toContain('default-config')
        })

        it('should filter configmaps by labels', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'app-config',
                    namespace: 'default',
                    labels: { app: 'nginx' },
                    data: { key: 'value' },
                }),
                createConfigMap({
                    name: 'db-config',
                    namespace: 'default',
                    labels: { app: 'redis' },
                    data: { key: 'value' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'configmaps',
                selector: { app: 'nginx' },
                flags: { l: 'app=nginx' },
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('app-config')
            expect(output).not.toContain('db-config')
        })

        it('should return "No resources found" when no configmaps exist', () => {
            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'configmaps',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toBe('No resources found')
        })
    })

    // ─── Secrets ─────────────────────────────────────────────────────────

    describe('secrets', () => {
        it('should list secrets with TYPE and DATA count', () => {
            state.secrets.items = [
                createSecret({
                    name: 'app-secret',
                    namespace: 'default',
                    secretType: { type: 'Opaque' },
                    data: { username: 'YWRtaW4=', password: 'cGFzc3dvcmQ=' },
                    creationTimestamp: new Date('2025-10-17T10:00:00Z').toISOString(),
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'secrets',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('NAME')
            expect(output).toContain('TYPE')
            expect(output).toContain('DATA')
            expect(output).toContain('AGE')
            expect(output).toContain('app-secret')
            expect(output).toContain('Opaque')
            expect(output).toContain('2')
        })

        it('should display service account token type correctly', () => {
            state.secrets.items = [
                createSecret({
                    name: 'sa-token',
                    namespace: 'default',
                    secretType: {
                        type: 'kubernetes.io/service-account-token',
                        serviceAccountName: 'default',
                    },
                    data: { token: 'dG9rZW4=' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'secrets',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('sa-token')
            expect(output).toContain('kubernetes.io/service-account-token')
        })

        it('should display dockerconfigjson type correctly', () => {
            state.secrets.items = [
                createSecret({
                    name: 'docker-secret',
                    namespace: 'default',
                    secretType: {
                        type: 'kubernetes.io/dockerconfigjson',
                        dockerConfigJson: '{}',
                    },
                    data: { '.dockerconfigjson': 'e30=' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'secrets',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('docker-secret')
            expect(output).toContain('kubernetes.io/dockerconfigjson')
        })

        it('should filter secrets by namespace', () => {
            state.secrets.items = [
                createSecret({
                    name: 'default-secret',
                    namespace: 'default',
                    secretType: { type: 'Opaque' },
                    data: { key: 'value' },
                }),
                createSecret({
                    name: 'kube-system-secret',
                    namespace: 'kube-system',
                    secretType: { type: 'Opaque' },
                    data: { key: 'value' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'secrets',
                namespace: 'kube-system',
                flags: { n: 'kube-system' },
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('kube-system-secret')
            expect(output).not.toContain('default-secret')
        })

        it('should filter secrets by labels', () => {
            state.secrets.items = [
                createSecret({
                    name: 'app-secret',
                    namespace: 'default',
                    labels: { app: 'nginx' },
                    secretType: { type: 'Opaque' },
                    data: { key: 'value' },
                }),
                createSecret({
                    name: 'db-secret',
                    namespace: 'default',
                    labels: { app: 'redis' },
                    secretType: { type: 'Opaque' },
                    data: { key: 'value' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'secrets',
                selector: { app: 'nginx' },
                flags: { l: 'app=nginx' },
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('app-secret')
            expect(output).not.toContain('db-secret')
        })

        it('should return "No resources found" when no secrets exist', () => {
            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'secrets',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toBe('No resources found')
        })
    })

    // ─── Namespaces ──────────────────────────────────────────────────────

    describe('namespaces', () => {
        it('should list namespaces', () => {
            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'namespaces',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toContain('NAME')
            expect(output).toContain('STATUS')
            expect(output).toContain('AGE')
            expect(output).toContain('default')
            expect(output).toContain('kube-system')
            expect(output).toContain('Active')
        })
    })

    // ─── Deployments (placeholder) ───────────────────────────────────────

    describe('deployments', () => {
        it('should return "No resources found" for deployments', () => {
            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'deployments',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toBe('No resources found')
        })
    })

    // ─── Services (placeholder) ──────────────────────────────────────────

    describe('services', () => {
        it('should return "No resources found" for services', () => {
            const parsed: ParsedCommand = {
                action: 'get',
                resource: 'services',
                flags: {},
            }

            const output = handleGet(state, parsed)
            expect(output).toBe('No resources found')
        })
    })
})

