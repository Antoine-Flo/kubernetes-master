import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTerminalManager } from '../../../src/terminal/TerminalManager'
import { createSeedCluster } from '../../../src/cluster/seedCluster'
import { createKubectlExecutor } from '../../../src/kubectl/commands/executor'
import { createLogger } from '../../../src/logger/Logger'
import { createFileSystem } from '../../../src/filesystem/FileSystem'

describe('Terminal-Kubectl Integration', () => {
    let container: HTMLElement
    let terminal: ReturnType<typeof createTerminalManager>
    let clusterState: ReturnType<typeof createSeedCluster>
    let fileSystem: ReturnType<typeof createFileSystem>
    let kubectlExecutor: ReturnType<typeof createKubectlExecutor>
    let logger: ReturnType<typeof createLogger>
    let writeSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
        container = document.createElement('div')
        terminal = createTerminalManager(container)
        clusterState = createSeedCluster()
        fileSystem = createFileSystem()
        logger = createLogger()
        kubectlExecutor = createKubectlExecutor(clusterState, fileSystem, logger)

        // Spy on terminal.write to capture output
        writeSpy = vi.fn()
        const originalWrite = terminal.write
        terminal.write = (text: string) => {
            writeSpy(text)
            originalWrite(text)
        }
    })

    it('executes kubectl get pods command and displays output', () => {
        terminal.onCommand((command) => {
            const result = kubectlExecutor.execute(command)
            if (result.ok) {
                const formattedOutput = result.value.split('\n').join('\r\n')
                terminal.write(`${formattedOutput}\r\n`)
            }
        })

        terminal.simulateInput('kubectl get pods')
        terminal.simulateInput('\r')

        // Check that output was written
        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('NAME')
        expect(outputCalls).toContain('STATUS')
        expect(outputCalls).toContain('nginx-deployment')
        expect(outputCalls).toContain('Running')
    })

    it('executes kubectl get pods with namespace filter', () => {
        terminal.onCommand((command) => {
            const result = kubectlExecutor.execute(command)
            if (result.ok) {
                const formattedOutput = result.value.split('\n').join('\r\n')
                terminal.write(`${formattedOutput}\r\n`)
            }
        })

        terminal.simulateInput('kubectl get pods -n kube-system')
        terminal.simulateInput('\r')

        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('coredns')
        expect(outputCalls).not.toContain('nginx-deployment')
    })

    it('executes kubectl describe pod command', () => {
        terminal.onCommand((command) => {
            const result = kubectlExecutor.execute(command)
            if (result.ok) {
                const formattedOutput = result.value.split('\n').join('\r\n')
                terminal.write(`${formattedOutput}\r\n`)
            }
        })

        terminal.simulateInput('kubectl describe pod nginx-deployment-7s8f')
        terminal.simulateInput('\r')

        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('Name:')
        expect(outputCalls).toContain('nginx-deployment-7s8f')
        expect(outputCalls).toContain('Namespace:')
        expect(outputCalls).toContain('default')
    })

    it('executes kubectl delete pod command', () => {
        terminal.onCommand((command) => {
            const result = kubectlExecutor.execute(command)
            if (result.ok) {
                const formattedOutput = result.value.split('\n').join('\r\n')
                terminal.write(`${formattedOutput}\r\n`)
            }
        })

        terminal.simulateInput('kubectl delete pod redis-master-0')
        terminal.simulateInput('\r')

        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('deleted')

        // Verify pod was actually deleted
        const pods = clusterState.getPods('default')
        expect(pods.find(p => p.metadata.name === 'redis-master-0')).toBeUndefined()
    })

    it('displays error for invalid kubectl command', () => {
        terminal.onCommand((command) => {
            const result = kubectlExecutor.execute(command)
            if (!result.ok) {
                terminal.write(`Error: ${result.error}\r\n`)
            }
        })

        terminal.simulateInput('kubectl invalid-command')
        terminal.simulateInput('\r')

        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('Error:')
    })

    it('displays parser error for malformed command', () => {
        terminal.onCommand((command) => {
            const result = kubectlExecutor.execute(command)
            if (!result.ok) {
                terminal.write(`Error: ${result.error}\r\n`)
            }
        })

        terminal.simulateInput('kubectl')
        terminal.simulateInput('\r')

        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('Error:')
        expect(outputCalls).toContain('Invalid or missing action')
    })

    it('handles non-kubectl commands with error message', () => {
        let commandReceived = ''

        terminal.onCommand((command) => {
            commandReceived = command.trim()

            if (!commandReceived.startsWith('kubectl')) {
                terminal.write(`Error: Command must start with 'kubectl'\r\n`)
                return
            }

            const result = kubectlExecutor.execute(commandReceived)
            if (result.ok) {
                terminal.write(`${result.value}\r\n`)
            }
        })

        terminal.simulateInput('ls')
        terminal.simulateInput('\r')

        expect(commandReceived).toBe('ls')
        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('Error:')
        expect(outputCalls).toContain('must start with')
    })

    it('full flow: command input → parse → execute → display', () => {
        terminal.onCommand((command) => {
            const trimmed = command.trim()

            if (!trimmed) {
                return
            }

            if (!trimmed.startsWith('kubectl')) {
                terminal.write(`Error: Command must start with 'kubectl'\r\n`)
                return
            }

            const result = kubectlExecutor.execute(trimmed)

            if (result.ok) {
                const formattedOutput = result.value.split('\n').join('\r\n')
                terminal.write(`${formattedOutput}\r\n`)
            } else {
                terminal.write(`Error: ${result.error}\r\n`)
            }
        })

        // Test successful command
        terminal.simulateInput('kubectl get pods')
        terminal.simulateInput('\r')

        let outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('nginx-deployment')

        // Clear spy
        writeSpy.mockClear()

        // Test error command
        terminal.simulateInput('kubectl get invalid-resource')
        terminal.simulateInput('\r')

        outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('Error:')
    })

    describe('kubectl apply/create integration', () => {
        beforeEach(() => {
            terminal.onCommand((command) => {
                const trimmed = command.trim()

                if (!trimmed) {
                    return
                }

                const result = kubectlExecutor.execute(trimmed)

                if (result.ok) {
                    if (result.value) {
                        const formattedOutput = result.value.split('\n').join('\r\n')
                        terminal.write(`${formattedOutput}\r\n`)
                    }
                } else {
                    terminal.write(`Error: ${result.error}\r\n`)
                }
            })
        })

        it('kubectl create: create YAML file → kubectl create → verify resource', () => {
            // Create YAML file in filesystem
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: integration-pod
  namespace: default
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            fileSystem.createFile('test-pod.yaml', yaml)

            // Execute kubectl create
            writeSpy.mockClear()
            terminal.simulateInput('kubectl create -f test-pod.yaml')
            terminal.simulateInput('\r')

            // Verify output
            const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
            expect(outputCalls).toContain('pod/integration-pod created')

            // Verify resource exists in cluster
            const pods = clusterState.getPods('default')
            const createdPod = pods.find(p => p.metadata.name === 'integration-pod')
            expect(createdPod).toBeDefined()
            expect(createdPod?.spec.containers[0].image).toBe('nginx:latest')
        })

        it('kubectl apply: apply new resource → verify creation', () => {
            // Create ConfigMap YAML
            const yaml = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: integration-config
data:
  key1: value1
`
            fileSystem.createFile('config.yaml', yaml)

            // Execute kubectl apply
            writeSpy.mockClear()
            terminal.simulateInput('kubectl apply -f config.yaml')
            terminal.simulateInput('\r')

            // Verify output
            const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
            expect(outputCalls).toContain('configmap/integration-config created')

            // Verify resource exists
            const configMaps = clusterState.getConfigMaps('default')
            const createdConfig = configMaps.find(cm => cm.metadata.name === 'integration-config')
            expect(createdConfig).toBeDefined()
        })

        it('kubectl apply: apply → modify file → apply again → verify update', () => {
            // Create initial YAML
            let yaml = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: update-test
data:
  version: "1.0"
`
            fileSystem.createFile('update.yaml', yaml)

            // First apply
            terminal.simulateInput('kubectl apply -f update.yaml')
            terminal.simulateInput('\r')

            // Verify initial state
            let configMaps = clusterState.getConfigMaps('default')
            let config = configMaps.find(cm => cm.metadata.name === 'update-test')
            expect(config?.data?.version).toBe('1.0')

            // Modify file
            yaml = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: update-test
data:
  version: "2.0"
  new_key: "new_value"
`
            fileSystem.writeFile('update.yaml', yaml)

            // Second apply
            writeSpy.mockClear()
            terminal.simulateInput('kubectl apply -f update.yaml')
            terminal.simulateInput('\r')

            // Verify update
            const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
            expect(outputCalls).toContain('configured')

            configMaps = clusterState.getConfigMaps('default')
            config = configMaps.find(cm => cm.metadata.name === 'update-test')
            expect(config?.data?.version).toBe('2.0')
            expect(config?.data?.new_key).toBe('new_value')
        })

        it('kubectl create: fails if resource already exists', () => {
            // Create YAML
            const yaml = `
apiVersion: v1
kind: Secret
metadata:
  name: duplicate-secret
type: Opaque
data:
  key: dmFsdWU=
`
            fileSystem.createFile('secret.yaml', yaml)

            // First create (should succeed)
            terminal.simulateInput('kubectl create -f secret.yaml')
            terminal.simulateInput('\r')

            // Second create (should fail)
            writeSpy.mockClear()
            terminal.simulateInput('kubectl create -f secret.yaml')
            terminal.simulateInput('\r')

            const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
            expect(outputCalls).toContain('Error:')
            expect(outputCalls).toContain('AlreadyExists')
        })

        it('kubectl apply: succeeds on existing resource (updates it)', () => {
            // Create initial resource
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: apply-test-pod
spec:
  containers:
    - name: nginx
      image: nginx:1.0
`
            fileSystem.createFile('apply-pod.yaml', yaml)

            // First apply
            terminal.simulateInput('kubectl apply -f apply-pod.yaml')
            terminal.simulateInput('\r')

            // Second apply (should succeed and update)
            writeSpy.mockClear()
            terminal.simulateInput('kubectl apply -f apply-pod.yaml')
            terminal.simulateInput('\r')

            const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
            expect(outputCalls).toContain('configured')
            expect(outputCalls).not.toContain('Error:')
        })

        it('handles file not found error', () => {
            writeSpy.mockClear()
            terminal.simulateInput('kubectl apply -f nonexistent.yaml')
            terminal.simulateInput('\r')

            const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
            expect(outputCalls).toContain('Error:')
            expect(outputCalls).toContain('not found')
        })

        it('handles invalid YAML syntax error', () => {
            fileSystem.createFile('invalid.yaml', 'invalid: [')

            writeSpy.mockClear()
            terminal.simulateInput('kubectl create -f invalid.yaml')
            terminal.simulateInput('\r')

            const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
            expect(outputCalls).toContain('Error:')
        })

        it('works with relative paths in subdirectories', () => {
            // Create subdirectory and file
            fileSystem.createDirectory('manifests', false)
            fileSystem.changeDirectory('manifests')

            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: subdir-pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            fileSystem.createFile('pod.yaml', yaml)
            fileSystem.changeDirectory('/')

            // Apply from subdirectory
            writeSpy.mockClear()
            terminal.simulateInput('kubectl apply -f manifests/pod.yaml')
            terminal.simulateInput('\r')

            const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
            expect(outputCalls).toContain('pod/subdir-pod created')

            // Verify pod exists
            const pods = clusterState.getPods('default')
            expect(pods.find(p => p.metadata.name === 'subdir-pod')).toBeDefined()
        })
    })
})

