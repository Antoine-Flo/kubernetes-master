import { describe, it, expect } from 'vitest'
import { createPod, type Pod, type Container } from '../../../../src/cluster/models/Pod'

describe('Pod Model', () => {
    describe('createPod', () => {
        it('should create a pod with minimal config', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            expect(pod).toBeDefined()
            expect(pod.metadata.name).toBe('test-pod')
            expect(pod.metadata.namespace).toBe('default')
            expect(pod.spec.containers).toEqual(containers)
        })

        it('should set default values correctly', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.apiVersion).toBe('v1')
            expect(pod.kind).toBe('Pod')
            expect(pod.status.phase).toBe('Pending')
            expect(pod.status.restartCount).toBe(0)
        })

        it('should accept optional labels', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const labels = { app: 'web', env: 'prod' }
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
                labels,
            })

            expect(pod.metadata.labels).toEqual(labels)
        })

        it('should create pod without labels when not provided', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.metadata.labels).toBeUndefined()
        })

        it('should set creationTimestamp as ISO string', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.metadata.creationTimestamp).toBeDefined()
            expect(typeof pod.metadata.creationTimestamp).toBe('string')

            // Verify it's a valid ISO date string
            const date = new Date(pod.metadata.creationTimestamp)
            expect(date.toISOString()).toBe(pod.metadata.creationTimestamp)
        })

        it('should accept optional creationTimestamp', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const timestamp = '2025-01-01T00:00:00.000Z'
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
                creationTimestamp: timestamp,
            })

            expect(pod.metadata.creationTimestamp).toBe(timestamp)
        })

        it('should create immutable pod object', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            // Attempting to modify should not affect the original
            const originalName = pod.metadata.name

            // TypeScript will prevent this, but testing runtime immutability
            expect(() => {
                ; (pod as any).metadata.name = 'modified'
            }).toThrow()

            expect(pod.metadata.name).toBe(originalName)
        })

        it('should support multiple containers', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                },
                {
                    name: 'sidecar',
                    image: 'sidecar:1.0',
                    ports: [{ containerPort: 8080 }],
                },
            ]

            const pod = createPod({
                name: 'multi-container-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers).toHaveLength(2)
            expect(pod.spec.containers[0].name).toBe('nginx')
            expect(pod.spec.containers[1].name).toBe('sidecar')
        })
    })

    describe('Resource Limits and Requests', () => {
        it('should support container resource requests', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                    resources: {
                        requests: {
                            cpu: '100m',
                            memory: '128Mi',
                        },
                    },
                },
            ]

            const pod = createPod({
                name: 'resource-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers[0].resources?.requests?.cpu).toBe('100m')
            expect(pod.spec.containers[0].resources?.requests?.memory).toBe('128Mi')
        })

        it('should support container resource limits', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                    resources: {
                        limits: {
                            cpu: '500m',
                            memory: '512Mi',
                        },
                    },
                },
            ]

            const pod = createPod({
                name: 'resource-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers[0].resources?.limits?.cpu).toBe('500m')
            expect(pod.spec.containers[0].resources?.limits?.memory).toBe('512Mi')
        })

        it('should support both requests and limits', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
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
            ]

            const pod = createPod({
                name: 'resource-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers[0].resources?.requests).toEqual({
                cpu: '100m',
                memory: '128Mi',
            })
            expect(pod.spec.containers[0].resources?.limits).toEqual({
                cpu: '500m',
                memory: '512Mi',
            })
        })
    })

    describe('Probes (ADT)', () => {
        it('should support httpGet liveness probe', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                    livenessProbe: {
                        type: 'httpGet',
                        path: '/health',
                        port: 8080,
                        initialDelaySeconds: 10,
                        periodSeconds: 5,
                    },
                },
            ]

            const pod = createPod({
                name: 'probe-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers[0].livenessProbe).toEqual({
                type: 'httpGet',
                path: '/health',
                port: 8080,
                initialDelaySeconds: 10,
                periodSeconds: 5,
            })
        })

        it('should support exec readiness probe', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    readinessProbe: {
                        type: 'exec',
                        command: ['cat', '/tmp/healthy'],
                        initialDelaySeconds: 5,
                    },
                },
            ]

            const pod = createPod({
                name: 'probe-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers[0].readinessProbe).toEqual({
                type: 'exec',
                command: ['cat', '/tmp/healthy'],
                initialDelaySeconds: 5,
            })
        })

        it('should support tcpSocket startup probe', () => {
            const containers: Container[] = [
                {
                    name: 'redis',
                    image: 'redis:latest',
                    startupProbe: {
                        type: 'tcpSocket',
                        port: 6379,
                        periodSeconds: 10,
                    },
                },
            ]

            const pod = createPod({
                name: 'probe-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers[0].startupProbe).toEqual({
                type: 'tcpSocket',
                port: 6379,
                periodSeconds: 10,
            })
        })

        it('should support all three probe types simultaneously', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    livenessProbe: {
                        type: 'httpGet',
                        path: '/healthz',
                        port: 8080,
                    },
                    readinessProbe: {
                        type: 'httpGet',
                        path: '/ready',
                        port: 8080,
                    },
                    startupProbe: {
                        type: 'tcpSocket',
                        port: 8080,
                    },
                },
            ]

            const pod = createPod({
                name: 'probe-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers[0].livenessProbe?.type).toBe('httpGet')
            expect(pod.spec.containers[0].readinessProbe?.type).toBe('httpGet')
            expect(pod.spec.containers[0].startupProbe?.type).toBe('tcpSocket')
        })
    })

    describe('Environment Variables (ADT)', () => {
        it('should support env var with direct value', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    env: [
                        {
                            name: 'LOG_LEVEL',
                            source: { type: 'value', value: 'debug' },
                        },
                    ],
                },
            ]

            const pod = createPod({
                name: 'env-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers[0].env).toEqual([
                {
                    name: 'LOG_LEVEL',
                    source: { type: 'value', value: 'debug' },
                },
            ])
        })

        it('should support env var from configMapKeyRef', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    env: [
                        {
                            name: 'DB_HOST',
                            source: {
                                type: 'configMapKeyRef',
                                name: 'app-config',
                                key: 'database.host',
                            },
                        },
                    ],
                },
            ]

            const pod = createPod({
                name: 'env-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers[0].env?.[0].source).toEqual({
                type: 'configMapKeyRef',
                name: 'app-config',
                key: 'database.host',
            })
        })

        it('should support env var from secretKeyRef', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    env: [
                        {
                            name: 'DB_PASSWORD',
                            source: {
                                type: 'secretKeyRef',
                                name: 'db-secret',
                                key: 'password',
                            },
                        },
                    ],
                },
            ]

            const pod = createPod({
                name: 'env-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers[0].env?.[0].source).toEqual({
                type: 'secretKeyRef',
                name: 'db-secret',
                key: 'password',
            })
        })

        it('should support multiple env vars with different sources', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    env: [
                        {
                            name: 'ENV',
                            source: { type: 'value', value: 'production' },
                        },
                        {
                            name: 'DB_HOST',
                            source: {
                                type: 'configMapKeyRef',
                                name: 'app-config',
                                key: 'database.host',
                            },
                        },
                        {
                            name: 'DB_PASSWORD',
                            source: {
                                type: 'secretKeyRef',
                                name: 'db-secret',
                                key: 'password',
                            },
                        },
                    ],
                },
            ]

            const pod = createPod({
                name: 'env-pod',
                namespace: 'default',
                containers,
            })

            expect(pod.spec.containers[0].env).toHaveLength(3)
            expect(pod.spec.containers[0].env?.[0].source.type).toBe('value')
            expect(pod.spec.containers[0].env?.[1].source.type).toBe('configMapKeyRef')
            expect(pod.spec.containers[0].env?.[2].source.type).toBe('secretKeyRef')
        })
    })

    describe('Volume Mounts (ADT)', () => {
        it('should support emptyDir volume', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    volumeMounts: [
                        {
                            name: 'cache',
                            mountPath: '/tmp/cache',
                        },
                    ],
                },
            ]

            const pod = createPod({
                name: 'volume-pod',
                namespace: 'default',
                containers,
                volumes: [
                    {
                        name: 'cache',
                        source: { type: 'emptyDir' },
                    },
                ],
            })

            expect(pod.spec.volumes).toEqual([
                {
                    name: 'cache',
                    source: { type: 'emptyDir' },
                },
            ])
            expect(pod.spec.containers[0].volumeMounts).toEqual([
                {
                    name: 'cache',
                    mountPath: '/tmp/cache',
                },
            ])
        })

        it('should support configMap volume', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    volumeMounts: [
                        {
                            name: 'config',
                            mountPath: '/etc/config',
                            readOnly: true,
                        },
                    ],
                },
            ]

            const pod = createPod({
                name: 'volume-pod',
                namespace: 'default',
                containers,
                volumes: [
                    {
                        name: 'config',
                        source: { type: 'configMap', name: 'app-config' },
                    },
                ],
            })

            expect(pod.spec.volumes?.[0].source).toEqual({
                type: 'configMap',
                name: 'app-config',
            })
            expect(pod.spec.containers[0].volumeMounts?.[0].readOnly).toBe(true)
        })

        it('should support secret volume', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    volumeMounts: [
                        {
                            name: 'secrets',
                            mountPath: '/etc/secrets',
                            readOnly: true,
                        },
                    ],
                },
            ]

            const pod = createPod({
                name: 'volume-pod',
                namespace: 'default',
                containers,
                volumes: [
                    {
                        name: 'secrets',
                        source: { type: 'secret', secretName: 'db-secret' },
                    },
                ],
            })

            expect(pod.spec.volumes?.[0].source).toEqual({
                type: 'secret',
                secretName: 'db-secret',
            })
        })

        it('should support multiple volumes of different types', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    volumeMounts: [
                        {
                            name: 'cache',
                            mountPath: '/tmp/cache',
                        },
                        {
                            name: 'config',
                            mountPath: '/etc/config',
                            readOnly: true,
                        },
                        {
                            name: 'secrets',
                            mountPath: '/etc/secrets',
                            readOnly: true,
                        },
                    ],
                },
            ]

            const pod = createPod({
                name: 'volume-pod',
                namespace: 'default',
                containers,
                volumes: [
                    {
                        name: 'cache',
                        source: { type: 'emptyDir' },
                    },
                    {
                        name: 'config',
                        source: { type: 'configMap', name: 'app-config' },
                    },
                    {
                        name: 'secrets',
                        source: { type: 'secret', secretName: 'db-secret' },
                    },
                ],
            })

            expect(pod.spec.volumes).toHaveLength(3)
            expect(pod.spec.containers[0].volumeMounts).toHaveLength(3)
            expect(pod.spec.volumes?.[0].source.type).toBe('emptyDir')
            expect(pod.spec.volumes?.[1].source.type).toBe('configMap')
            expect(pod.spec.volumes?.[2].source.type).toBe('secret')
        })
    })

    describe('Immutability with Enhanced Features', () => {
        it('should maintain immutability with resources', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                    resources: {
                        requests: { cpu: '100m', memory: '128Mi' },
                    },
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            expect(() => {
                ; (pod.spec.containers[0] as any).resources.requests.cpu = '200m'
            }).toThrow()
        })

        it('should maintain immutability with probes', () => {
            const containers: Container[] = [
                {
                    name: 'nginx',
                    image: 'nginx:latest',
                    livenessProbe: {
                        type: 'httpGet',
                        path: '/health',
                        port: 8080,
                    },
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            expect(() => {
                ; (pod.spec.containers[0] as any).livenessProbe.port = 9090
            }).toThrow()
        })

        it('should maintain immutability with env vars', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    env: [
                        {
                            name: 'LOG_LEVEL',
                            source: { type: 'value', value: 'debug' },
                        },
                    ],
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
            })

            expect(() => {
                ; (pod.spec.containers[0] as any).env[0].name = 'OTHER'
            }).toThrow()
        })

        it('should maintain immutability with volumes', () => {
            const containers: Container[] = [
                {
                    name: 'app',
                    image: 'myapp:latest',
                    volumeMounts: [
                        {
                            name: 'cache',
                            mountPath: '/tmp/cache',
                        },
                    ],
                },
            ]

            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers,
                volumes: [
                    {
                        name: 'cache',
                        source: { type: 'emptyDir' },
                    },
                ],
            })

            expect(() => {
                ; (pod.spec.volumes?.[0] as any).name = 'other'
            }).toThrow()
        })
    })
})

