import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTerminalManager } from '../../../src/terminal/TerminalManager'
import { createSeedCluster } from '../../../src/cluster/seedCluster'
import { createKubectlExecutor } from '../../../src/kubectl/commands/executor'

describe('Terminal-Kubectl Integration', () => {
    let container: HTMLElement
    let terminal: ReturnType<typeof createTerminalManager>
    let clusterState: ReturnType<typeof createSeedCluster>
    let kubectlExecutor: ReturnType<typeof createKubectlExecutor>
    let writeSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
        container = document.createElement('div')
        terminal = createTerminalManager(container)
        clusterState = createSeedCluster()
        kubectlExecutor = createKubectlExecutor(clusterState)

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
            if (result.type === 'success') {
                const formattedOutput = result.output.split('\n').join('\r\n')
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
            if (result.type === 'success') {
                const formattedOutput = result.output.split('\n').join('\r\n')
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
            if (result.type === 'success') {
                const formattedOutput = result.output.split('\n').join('\r\n')
                terminal.write(`${formattedOutput}\r\n`)
            }
        })

        terminal.simulateInput('kubectl describe pod nginx-deployment-7d8f6c9b5d-x7k2m')
        terminal.simulateInput('\r')

        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('Name:')
        expect(outputCalls).toContain('nginx-deployment-7d8f6c9b5d-x7k2m')
        expect(outputCalls).toContain('Namespace:')
        expect(outputCalls).toContain('default')
    })

    it('executes kubectl delete pod command', () => {
        terminal.onCommand((command) => {
            const result = kubectlExecutor.execute(command)
            if (result.type === 'success') {
                const formattedOutput = result.output.split('\n').join('\r\n')
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
            if (result.type === 'error') {
                terminal.write(`Error: ${result.message}\r\n`)
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
            if (result.type === 'error') {
                terminal.write(`Error: ${result.message}\r\n`)
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
            if (result.type === 'success') {
                terminal.write(`${result.output}\r\n`)
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

            if (result.type === 'success') {
                const formattedOutput = result.output.split('\n').join('\r\n')
                terminal.write(`${formattedOutput}\r\n`)
            } else {
                terminal.write(`Error: ${result.message}\r\n`)
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
})

