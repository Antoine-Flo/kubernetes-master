import { describe, it, expect, beforeEach } from 'vitest'
import { handleDescribe } from '../../../../../src/kubectl/commands/handlers/describe'
import type { ClusterStateData } from '../../../../../src/cluster/ClusterState'
import type { ParsedCommand } from '../../../../../src/kubectl/commands/types'
import { createPod } from '../../../../../src/cluster/models/Pod'
import { createConfigMap } from '../../../../../src/cluster/models/ConfigMap'
import { createSecret } from '../../../../../src/cluster/models/Secret'

describe('handleDescribe', () => {
    let state: ClusterStateData

    beforeEach(() => {
        // Create empty state
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
                action: 'describe',
                resource: 'pods',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Resource name is required')
            }
        })

        it('should return error for unsupported resource type', () => {
            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'deployments',
                name: 'my-deploy',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not supported')
                expect(result.error).toContain('deployments')
            }
        })

        it('should return error when pod not found', () => {
            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'pods',
                name: 'nonexistent',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not found')
                expect(result.error).toContain('nonexistent')
            }
        })

        it('should return error when resource in wrong namespace', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'pods',
                name: 'nginx',
                namespace: 'kube-system',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not found')
                expect(result.error).toContain('kube-system')
            }
        })
    })

    // ─── Pods ────────────────────────────────────────────────────────────

    describe('pods', () => {
        it('should describe basic pod with single container', () => {
            state.pods.items = [
                createPod({
                    name: 'nginx-pod',
                    namespace: 'default',
                    containers: [{ name: 'nginx', image: 'nginx:latest' }],
                    phase: 'Running',
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'pods',
                name: 'nginx-pod',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Name:         nginx-pod')
                expect(result.value).toContain('Namespace:    default')
                expect(result.value).toContain('Status:       Running')
                expect(result.value).toContain('IP:           172.17.0.')
                expect(result.value).toContain('Containers:')
                expect(result.value).toContain('  nginx:')
                expect(result.value).toContain('    Image:      nginx:latest')
            }
        })

        it('should describe pod with multiple containers', () => {
            state.pods.items = [
                createPod({
                    name: 'multi-pod',
                    namespace: 'default',
                    containers: [
                        { name: 'app', image: 'app:v1' },
                        { name: 'sidecar', image: 'logging:latest' },
                    ],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'pods',
                name: 'multi-pod',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('  app:')
                expect(result.value).toContain('    Image:      app:v1')
                expect(result.value).toContain('  sidecar:')
                expect(result.value).toContain('    Image:      logging:latest')
            }
        })

        it('should describe pod with resource requests and limits', () => {
            state.pods.items = [
                createPod({
                    name: 'resource-pod',
                    namespace: 'default',
                    containers: [
                        {
                            name: 'app',
                            image: 'app:v1',
                            resources: {
                                requests: {
                                    cpu: '100m',
                                    memory: '128Mi',
                                },
                                limits: {
                                    cpu: '500m',
                                    memory: '512Mi',
                                },
                            },
                        },
                    ],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'pods',
                name: 'resource-pod',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Requests:')
                expect(result.value).toContain('cpu: 100m')
                expect(result.value).toContain('memory: 128Mi')
                expect(result.value).toContain('Limits:')
                expect(result.value).toContain('cpu: 500m')
                expect(result.value).toContain('memory: 512Mi')
            }
        })

        it('should describe pod with all probe types', () => {
            state.pods.items = [
                createPod({
                    name: 'probe-pod',
                    namespace: 'default',
                    containers: [
                        {
                            name: 'app',
                            image: 'app:v1',
                            livenessProbe: {
                                type: 'httpGet',
                                path: '/health',
                                port: 8080,
                                initialDelaySeconds: 10,
                                periodSeconds: 5,
                            },
                            readinessProbe: {
                                type: 'exec',
                                command: ['cat', '/tmp/ready'],
                                initialDelaySeconds: 5,
                            },
                            startupProbe: {
                                type: 'tcpSocket',
                                port: 8080,
                                periodSeconds: 10,
                            },
                        },
                    ],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'pods',
                name: 'probe-pod',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Liveness:')
                expect(result.value).toContain('http-get /health on port 8080')
                expect(result.value).toContain('delay=10s')
                expect(result.value).toContain('period=5s')

                expect(result.value).toContain('Readiness:')
                expect(result.value).toContain('exec [cat /tmp/ready]')
                expect(result.value).toContain('delay=5s')

                expect(result.value).toContain('Startup:')
                expect(result.value).toContain('tcp-socket :8080')
                expect(result.value).toContain('period=10s')
            }
        })

        it('should describe pod with environment variables from values', () => {
            state.pods.items = [
                createPod({
                    name: 'env-pod',
                    namespace: 'default',
                    containers: [
                        {
                            name: 'app',
                            image: 'app:v1',
                            env: [
                                { name: 'ENV', source: { type: 'value', value: 'production' } },
                                { name: 'DEBUG', source: { type: 'value', value: 'false' } },
                            ],
                        },
                    ],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'pods',
                name: 'env-pod',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Environment:')
                expect(result.value).toContain('ENV:  production')
                expect(result.value).toContain('DEBUG:  false')
            }
        })

        it('should describe pod with environment variables from ConfigMap and Secret refs (masked)', () => {
            state.pods.items = [
                createPod({
                    name: 'ref-pod',
                    namespace: 'default',
                    containers: [
                        {
                            name: 'app',
                            image: 'app:v1',
                            env: [
                                {
                                    name: 'CONFIG_VALUE',
                                    source: {
                                        type: 'configMapKeyRef',
                                        name: 'app-config',
                                        key: 'config.json',
                                    },
                                },
                                {
                                    name: 'SECRET_KEY',
                                    source: {
                                        type: 'secretKeyRef',
                                        name: 'app-secret',
                                        key: 'api-key',
                                    },
                                },
                            ],
                        },
                    ],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'pods',
                name: 'ref-pod',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Environment:')
                expect(result.value).toContain(
                    "CONFIG_VALUE:  <set to the key 'config.json' in config map 'app-config'>"
                )
                expect(result.value).toContain(
                    "SECRET_KEY:  <set to the key 'api-key' of secret 'app-secret'>"
                )
                // Verify secret values are not exposed
                expect(result.value).not.toContain('actual-secret-value')
            }
        })

        it('should describe pod with volume mounts and volumes', () => {
            state.pods.items = [
                createPod({
                    name: 'volume-pod',
                    namespace: 'default',
                    containers: [
                        {
                            name: 'app',
                            image: 'app:v1',
                            volumeMounts: [
                                { name: 'config-vol', mountPath: '/etc/config', readOnly: true },
                                { name: 'data-vol', mountPath: '/data' },
                            ],
                        },
                    ],
                    volumes: [
                        { name: 'config-vol', source: { type: 'configMap', name: 'app-config' } },
                        { name: 'data-vol', source: { type: 'emptyDir' } },
                    ],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'pods',
                name: 'volume-pod',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Mounts:')
                expect(result.value).toContain('config-vol from config-vol (/etc/config) (ro)')
                expect(result.value).toContain('data-vol from data-vol (/data) (rw)')

                expect(result.value).toContain('Volumes:')
                expect(result.value).toContain('config-vol:')
                expect(result.value).toContain('Type:       ConfigMap')
                expect(result.value).toContain('Name:       app-config')
                expect(result.value).toContain('data-vol:')
                expect(result.value).toContain('Type:       EmptyDir')
            }
        })

        it('should describe pod with labels and annotations', () => {
            state.pods.items = [
                createPod({
                    name: 'labeled-pod',
                    namespace: 'default',
                    containers: [{ name: 'app', image: 'app:v1' }],
                    labels: { app: 'web', version: 'v1' },
                    annotations: { 'author': 'team-a', 'description': 'Main web app' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'pods',
                name: 'labeled-pod',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Labels:')
                expect(result.value).toContain('app=web')
                expect(result.value).toContain('version=v1')
                expect(result.value).toContain('Annotations:')
                expect(result.value).toContain('author=team-a')
                expect(result.value).toContain('description=Main web app')
            }
        })

        it('should show <none> for missing labels and annotations', () => {
            state.pods.items = [
                createPod({
                    name: 'plain-pod',
                    namespace: 'default',
                    containers: [{ name: 'app', image: 'app:v1' }],
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'pods',
                name: 'plain-pod',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Labels:       <none>')
                expect(result.value).toContain('Annotations:  <none>')
            }
        })
    })

    // ─── ConfigMaps ──────────────────────────────────────────────────────

    describe('configmaps', () => {
        it('should describe ConfigMap with data', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'app-config',
                    namespace: 'default',
                    data: {
                        'config.json': '{"port": 8080}',
                        'database.url': 'postgres://localhost:5432',
                    },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'configmaps',
                name: 'app-config',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Name:         app-config')
                expect(result.value).toContain('Namespace:    default')
                expect(result.value).toContain('Data')
                expect(result.value).toContain('====')
                expect(result.value).toContain('config.json:')
                expect(result.value).toContain('{"port": 8080}')
                expect(result.value).toContain('database.url:')
                expect(result.value).toContain('postgres://localhost:5432')
            }
        })

        it('should describe ConfigMap with binaryData', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'binary-config',
                    namespace: 'default',
                    binaryData: {
                        'image.png': 'iVBORw0KGgoAAAANSUhEUgAAAAUA',
                    },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'configmaps',
                name: 'binary-config',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('BinaryData')
                expect(result.value).toContain('image.png:')
                expect(result.value).toContain('bytes')
            }
        })

        it('should describe ConfigMap with labels and annotations', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'labeled-config',
                    namespace: 'default',
                    data: { key: 'value' },
                    labels: { env: 'prod' },
                    annotations: { owner: 'team-b' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'configmaps',
                name: 'labeled-config',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Labels:       env=prod')
                expect(result.value).toContain('Annotations:  owner=team-b')
            }
        })

        it('should return error when ConfigMap not found', () => {
            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'configmaps',
                name: 'missing',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('ConfigMap "missing" not found')
            }
        })

        it('should show <no data> for empty ConfigMap', () => {
            state.configMaps.items = [
                createConfigMap({
                    name: 'empty-config',
                    namespace: 'default',
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'configmaps',
                name: 'empty-config',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('<no data>')
            }
        })
    })

    // ─── Secrets ─────────────────────────────────────────────────────────

    describe('secrets', () => {
        it('should describe Secret with Opaque type (data masked)', () => {
            state.secrets.items = [
                createSecret({
                    name: 'app-secret',
                    namespace: 'default',
                    secretType: { type: 'Opaque' },
                    data: {
                        username: 'YWRtaW4=',
                        password: 'cGFzc3dvcmQxMjM=',
                    },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'secrets',
                name: 'app-secret',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Name:         app-secret')
                expect(result.value).toContain('Namespace:    default')
                expect(result.value).toContain('Type:  Opaque')
                expect(result.value).toContain('Data')
                expect(result.value).toContain('====')
                expect(result.value).toContain('username:')
                expect(result.value).toContain('bytes')
                expect(result.value).toContain('password:')
                // Verify actual values are not exposed
                expect(result.value).not.toContain('YWRtaW4=')
                expect(result.value).not.toContain('cGFzc3dvcmQxMjM=')
            }
        })

        it('should describe Secret with labels and annotations', () => {
            state.secrets.items = [
                createSecret({
                    name: 'labeled-secret',
                    namespace: 'default',
                    secretType: { type: 'Opaque' },
                    data: { key: 'dmFsdWU=' },
                    labels: { tier: 'backend' },
                    annotations: { managed: 'terraform' },
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'secrets',
                name: 'labeled-secret',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Labels:       tier=backend')
                expect(result.value).toContain('Annotations:  managed=terraform')
            }
        })

        it('should return error when Secret not found', () => {
            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'secrets',
                name: 'missing',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Secret "missing" not found')
            }
        })

        it('should describe different secret types', () => {
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

            const parsed1: ParsedCommand = {
                action: 'describe',
                resource: 'secrets',
                name: 'sa-token',
                flags: {},
            }

            const result1 = handleDescribe(state, parsed1)
            expect(result1.ok).toBe(true)
            if (result1.ok) {
                expect(result1.value).toContain('Type:  kubernetes.io/service-account-token')
            }

            const parsed2: ParsedCommand = {
                action: 'describe',
                resource: 'secrets',
                name: 'docker-secret',
                flags: {},
            }

            const result2 = handleDescribe(state, parsed2)
            expect(result2.ok).toBe(true)
            if (result2.ok) {
                expect(result2.value).toContain('Type:  kubernetes.io/dockerconfigjson')
            }
        })

        it('should show <no data> for empty Secret', () => {
            state.secrets.items = [
                createSecret({
                    name: 'empty-secret',
                    namespace: 'default',
                    secretType: { type: 'Opaque' },
                    data: {},
                }),
            ]

            const parsed: ParsedCommand = {
                action: 'describe',
                resource: 'secrets',
                name: 'empty-secret',
                flags: {},
            }

            const result = handleDescribe(state, parsed)
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('<no data>')
            }
        })
    })
})

