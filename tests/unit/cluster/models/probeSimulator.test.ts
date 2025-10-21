import { describe, it, expect } from 'vitest'
import {
    evaluateLivenessProbe,
    evaluateReadinessProbe,
    simulateProbeCheck,
} from '../../../../src/cluster/probeSimulator'
import { createPod, type Probe } from '../../../../src/cluster/ressources/Pod'

describe('Probe Simulator', () => {
    describe('simulateProbeCheck', () => {
        it('should succeed for httpGet probe when pod is Running', () => {
            const probe: Probe = {
                type: 'httpGet',
                path: '/health',
                port: 8080,
            }

            const result = simulateProbeCheck(probe, 'Running', 5000)

            expect(result.success).toBe(true)
        })

        it('should fail for httpGet probe when pod is Pending', () => {
            const probe: Probe = {
                type: 'httpGet',
                path: '/health',
                port: 8080,
            }

            const result = simulateProbeCheck(probe, 'Pending', 1000)

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.reason).toContain('not ready')
            }
        })

        it('should fail for exec probe when pod is Failed', () => {
            const probe: Probe = {
                type: 'exec',
                command: ['cat', '/tmp/healthy'],
            }

            const result = simulateProbeCheck(probe, 'Failed', 5000)

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.reason).toContain('failed')
            }
        })

        it('should succeed for tcpSocket probe when pod is Running', () => {
            const probe: Probe = {
                type: 'tcpSocket',
                port: 6379,
            }

            const result = simulateProbeCheck(probe, 'Running', 5000)

            expect(result.success).toBe(true)
        })

        it('should respect initialDelaySeconds', () => {
            const probe: Probe = {
                type: 'httpGet',
                path: '/health',
                port: 8080,
                initialDelaySeconds: 10,
            }

            // Before initialDelay - should fail
            const resultBefore = simulateProbeCheck(probe, 'Running', 5000)
            expect(resultBefore.success).toBe(false)
            if (!resultBefore.success) {
                expect(resultBefore.reason).toContain('initial delay')
            }

            // After initialDelay - should succeed
            const resultAfter = simulateProbeCheck(probe, 'Running', 15000)
            expect(resultAfter.success).toBe(true)
        })

        it('should default initialDelaySeconds to 0', () => {
            const probe: Probe = {
                type: 'httpGet',
                path: '/health',
                port: 8080,
            }

            const result = simulateProbeCheck(probe, 'Running', 0)

            expect(result.success).toBe(true)
        })

        it('should succeed for exec probe with correct command', () => {
            const probe: Probe = {
                type: 'exec',
                command: ['cat', '/tmp/healthy'],
            }

            const result = simulateProbeCheck(probe, 'Running', 5000)

            expect(result.success).toBe(true)
        })

        it('should succeed for tcpSocket probe when port is accessible', () => {
            const probe: Probe = {
                type: 'tcpSocket',
                port: 80,
            }

            const result = simulateProbeCheck(probe, 'Running', 5000)

            expect(result.success).toBe(true)
        })
    })

    describe('evaluateLivenessProbe', () => {
        it('should succeed when liveness probe passes', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [
                    {
                        name: 'app',
                        image: 'myapp:latest',
                        livenessProbe: {
                            type: 'httpGet',
                            path: '/healthz',
                            port: 8080,
                        },
                    },
                ],
                phase: 'Running',
            })

            const result = evaluateLivenessProbe(pod, pod.spec.containers[0].livenessProbe!)

            expect(result.success).toBe(true)
        })

        it('should fail when pod is not ready for liveness check', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [
                    {
                        name: 'app',
                        image: 'myapp:latest',
                        livenessProbe: {
                            type: 'httpGet',
                            path: '/healthz',
                            port: 8080,
                        },
                    },
                ],
                phase: 'Pending',
            })

            const result = evaluateLivenessProbe(pod, pod.spec.containers[0].livenessProbe!)

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.reason).toBeDefined()
            }
        })

        it('should respect initialDelaySeconds for liveness probe', () => {
            const recentPod = createPod({
                name: 'recent-pod',
                namespace: 'default',
                containers: [
                    {
                        name: 'app',
                        image: 'myapp:latest',
                        livenessProbe: {
                            type: 'httpGet',
                            path: '/healthz',
                            port: 8080,
                            initialDelaySeconds: 30,
                        },
                    },
                ],
                phase: 'Running',
                creationTimestamp: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
            })

            const result = evaluateLivenessProbe(
                recentPod,
                recentPod.spec.containers[0].livenessProbe!
            )

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.reason).toContain('initial delay')
            }
        })
    })

    describe('evaluateReadinessProbe', () => {
        it('should succeed when readiness probe passes', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [
                    {
                        name: 'app',
                        image: 'myapp:latest',
                        readinessProbe: {
                            type: 'httpGet',
                            path: '/ready',
                            port: 8080,
                        },
                    },
                ],
                phase: 'Running',
            })

            const result = evaluateReadinessProbe(pod, pod.spec.containers[0].readinessProbe!)

            expect(result.success).toBe(true)
        })

        it('should fail when pod is not running', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [
                    {
                        name: 'app',
                        image: 'myapp:latest',
                        readinessProbe: {
                            type: 'tcpSocket',
                            port: 8080,
                        },
                    },
                ],
                phase: 'Pending',
            })

            const result = evaluateReadinessProbe(pod, pod.spec.containers[0].readinessProbe!)

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.reason).toContain('not ready')
            }
        })

        it('should respect initialDelaySeconds for readiness probe', () => {
            const recentPod = createPod({
                name: 'recent-pod',
                namespace: 'default',
                containers: [
                    {
                        name: 'app',
                        image: 'myapp:latest',
                        readinessProbe: {
                            type: 'exec',
                            command: ['cat', '/tmp/ready'],
                            initialDelaySeconds: 20,
                        },
                    },
                ],
                phase: 'Running',
                creationTimestamp: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
            })

            const result = evaluateReadinessProbe(
                recentPod,
                recentPod.spec.containers[0].readinessProbe!
            )

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.reason).toContain('initial delay')
            }
        })

        it('should succeed after sufficient time has passed', () => {
            const oldPod = createPod({
                name: 'old-pod',
                namespace: 'default',
                containers: [
                    {
                        name: 'app',
                        image: 'myapp:latest',
                        readinessProbe: {
                            type: 'httpGet',
                            path: '/ready',
                            port: 8080,
                            initialDelaySeconds: 10,
                        },
                    },
                ],
                phase: 'Running',
                creationTimestamp: new Date(Date.now() - 60000).toISOString(), // 60 seconds ago
            })

            const result = evaluateReadinessProbe(oldPod, oldPod.spec.containers[0].readinessProbe!)

            expect(result.success).toBe(true)
        })
    })
})

