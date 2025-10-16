import { describe, it, expect, beforeEach } from 'vitest'
import { createKubectlExecutor } from '../../../../src/kubectl/commands/executor'
import { createClusterState } from '../../../../src/cluster/ClusterState'
import { createPod } from '../../../../src/cluster/models/Pod'
import { createLogger } from '../../../../src/logger/Logger'

describe('kubectl Executor', () => {
    describe('createKubectlExecutor', () => {
        let clusterState: ReturnType<typeof createClusterState>
        let logger: ReturnType<typeof createLogger>

        beforeEach(() => {
            clusterState = createClusterState()
            logger = createLogger()

            // Seed with test pods
            clusterState.addPod(
                createPod({
                    name: 'nginx-pod',
                    namespace: 'default',
                    containers: [
                        { name: 'nginx', image: 'nginx:latest', ports: [{ containerPort: 80 }] }
                    ]
                })
            )
            clusterState.addPod(
                createPod({
                    name: 'redis-pod',
                    namespace: 'kube-system',
                    containers: [
                        { name: 'redis', image: 'redis:alpine', ports: [] }
                    ]
                })
            )
        })

        describe('command routing', () => {
            it('should route "kubectl get pods" to get handler', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl get pods')
                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data).toContain('nginx-pod')
                }
            })

            it('should route "kubectl describe pod" to describe handler', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl describe pod nginx-pod')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data).toContain('nginx-pod')
                }
            })

            it('should route "kubectl delete pod" to delete handler', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl delete pod nginx-pod')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data).toContain('deleted')
                }
            })

            it('should route "kubectl apply -f" to apply handler', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl apply -f pod.yaml')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data).toContain('apply')
                }
            })

            it('should route "kubectl create -f" to create handler', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl create -f deployment.yaml')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data).toContain('create')
                }
            })
        })

        describe('get command with different resources', () => {
            it('should handle "kubectl get pods"', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl get pods')

                expect(result.type).toBe('success')
            })

            it('should handle "kubectl get deployments"', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl get deployments')

                expect(result.type).toBe('success')
            })

            it('should handle "kubectl get services"', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl get services')

                expect(result.type).toBe('success')
            })

            it('should handle "kubectl get namespaces"', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl get namespaces')

                expect(result.type).toBe('success')
            })
        })

        describe('namespace handling', () => {
            it('should pass namespace to get handler from -n flag', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl get pods -n kube-system')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data).toContain('redis-pod')
                    expect(result.data).not.toContain('nginx-pod')
                }
            })

            it('should pass namespace to describe handler', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl describe pod redis-pod -n kube-system')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data).toContain('redis-pod')
                }
            })

            it('should use default namespace when not specified', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl get pods')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data).toContain('nginx-pod')
                    expect(result.data).not.toContain('redis-pod')
                }
            })
        })

        describe('error handling', () => {
            it('should return error for invalid command syntax', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('invalid command')

                expect(result.type).toBe('error')
                if (result.type === 'error') {
                    expect(result.message).toBeTruthy()
                }
            })

            it('should return error for empty command', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('')

                expect(result.type).toBe('error')
                if (result.type === 'error') {
                    expect(result.message).toContain('empty')
                }
            })

            it('should return error when pod not found', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl describe pod nonexistent')

                expect(result.type).toBe('error')
                if (result.type === 'error') {
                    expect(result.message).toContain('not found')
                }
            })

            it('should return error for pod in wrong namespace', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl describe pod nginx-pod -n kube-system')

                expect(result.type).toBe('error')
                if (result.type === 'error') {
                    expect(result.message).toContain('not found')
                }
            })
        })

        describe('delete command', () => {
            it('should delete pod and return success message', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl delete pod nginx-pod')

                expect(result.type).toBe('success')

                // Verify pod is actually deleted
                const pods = clusterState.getPods('default')
                expect(pods.find(p => p.metadata.name === 'nginx-pod')).toBeUndefined()
            })

            it('should delete pod with namespace specified', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl delete pod redis-pod -n kube-system')

                expect(result.type).toBe('success')

                const pods = clusterState.getPods('kube-system')
                expect(pods.find(p => p.metadata.name === 'redis-pod')).toBeUndefined()
            })

            it('should return error when deleting nonexistent pod', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl delete pod nonexistent')

                expect(result.type).toBe('error')
                if (result.type === 'error') {
                    expect(result.message).toContain('not found')
                }
            })
        })

        describe('resource aliases', () => {
            it('should handle "kubectl get po" (pods alias)', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl get po')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data).toContain('nginx-pod')
                }
            })

            it('should handle "kubectl describe po nginx-pod" (pod alias)', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl describe po nginx-pod')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data).toContain('nginx-pod')
                }
            })

            it('should handle "kubectl delete po nginx-pod" (pod alias)', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl delete po nginx-pod')

                expect(result.type).toBe('success')
            })
        })

        describe('integration with parser', () => {
            it('should handle complete command flow: parse → route → execute', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl get pods -n default')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data).toBeTruthy()
                    expect(result.data).toContain('nginx-pod')
                }
            })

            it('should propagate parser errors correctly', () => {
                const executor = createKubectlExecutor(clusterState, logger)
                const result = executor.execute('kubectl get invalidresource')

                expect(result.type).toBe('error')
                if (result.type === 'error') {
                    expect(result.message).toBeTruthy()
                }
            })
        })
    })
})

