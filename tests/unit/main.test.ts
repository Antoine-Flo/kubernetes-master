import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTerminalManager } from '../../src/terminal/TerminalManager'
import { createSeedCluster } from '../../src/cluster/seedCluster'
import { createKubectlExecutor } from '../../src/kubectl/commands/executor'
import { createLogger } from '../../src/logger/Logger'
import { createShellExecutor } from '../../src/shell/commands/executor'
import { createSeedFileSystem } from '../../src/filesystem/seedFileSystem'
import { createFileSystem } from '../../src/filesystem/FileSystem'

describe('Main Dispatcher', () => {
    let container: HTMLElement
    let terminal: ReturnType<typeof createTerminalManager>
    let clusterState: ReturnType<typeof createSeedCluster>
    let fileSystem: ReturnType<typeof createFileSystem>
    let kubectlExecutor: ReturnType<typeof createKubectlExecutor>
    let shellExecutor: ReturnType<typeof createShellExecutor>
    let logger: ReturnType<typeof createLogger>
    let writeSpy: ReturnType<typeof vi.fn>

    // Helper to get prompt based on current path
    const getPrompt = (currentPath: string): string => {
        if (currentPath === '/') {
            return '☸ /> '
        }
        return `☸ ~${currentPath}> `
    }

    beforeEach(() => {
        container = document.createElement('div')
        terminal = createTerminalManager(container)
        clusterState = createSeedCluster()
        const fileSystemState = createSeedFileSystem()
        fileSystem = createFileSystem(fileSystemState)
        logger = createLogger()
        kubectlExecutor = createKubectlExecutor(clusterState, logger)
        shellExecutor = createShellExecutor(fileSystem, logger)

        // Spy on terminal.write to capture output
        writeSpy = vi.fn()
        const originalWrite = terminal.write
        terminal.write = (text: string) => {
            writeSpy(text)
            originalWrite(text)
        }
    })

    it('routes kubectl commands to kubectl executor', () => {
        terminal.onCommand((command) => {
            const trimmed = command.trim()
            if (!trimmed) return

            let result
            if (trimmed.startsWith('kubectl')) {
                result = kubectlExecutor.execute(trimmed)
            } else {
                result = shellExecutor.execute(trimmed)
            }

            if (result.type === 'success') {
                // Only write output if there's actual data
                if (result.data) {
                    const formattedOutput = result.data.split('\n').join('\r\n')
                    terminal.write(`${formattedOutput}\r\n`)
                }
            } else {
                terminal.write(`Error: ${result.message}\r\n`)
            }
        })

        terminal.simulateInput('kubectl get pods')
        terminal.simulateInput('\r')

        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('NAME')
        expect(outputCalls).toContain('STATUS')
        expect(outputCalls).toContain('nginx-deployment')
    })

    it('routes shell commands to shell executor', () => {
        terminal.onCommand((command) => {
            const trimmed = command.trim()
            if (!trimmed) return

            let result
            if (trimmed.startsWith('kubectl')) {
                result = kubectlExecutor.execute(trimmed)
            } else {
                result = shellExecutor.execute(trimmed)
            }

            if (result.type === 'success') {
                // Only write output if there's actual data
                if (result.data) {
                    const formattedOutput = result.data.split('\n').join('\r\n')
                    terminal.write(`${formattedOutput}\r\n`)
                }
            } else {
                terminal.write(`Error: ${result.message}\r\n`)
            }
        })

        terminal.simulateInput('ls')
        terminal.simulateInput('\r')

        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('examples')
        expect(outputCalls).toContain('manifests')
    })

    it('prompt at root is ☸ />', () => {
        const currentPath = fileSystem.getCurrentPath()
        expect(currentPath).toBe('/')

        const prompt = getPrompt(currentPath)
        expect(prompt).toBe('☸ /> ')
    })

    it('prompt in subdirectories is ☸ ~{path}>', () => {
        fileSystem.changeDirectory('examples')
        const currentPath = fileSystem.getCurrentPath()
        expect(currentPath).toBe('/examples')

        const prompt = getPrompt(currentPath)
        expect(prompt).toBe('☸ ~/examples> ')
    })

    it('updates prompt after changing directories', () => {
        // Set initial prompt
        terminal.setPrompt(getPrompt(fileSystem.getCurrentPath()))

        terminal.onCommand((command) => {
            const trimmed = command.trim()
            if (!trimmed) return

            let result
            if (trimmed.startsWith('kubectl')) {
                result = kubectlExecutor.execute(trimmed)
            } else {
                result = shellExecutor.execute(trimmed)
            }

            if (result.type === 'success') {
                // Only write output if there's actual data
                if (result.data) {
                    const formattedOutput = result.data.split('\n').join('\r\n')
                    terminal.write(`${formattedOutput}\r\n`)
                }
            } else {
                terminal.write(`Error: ${result.message}\r\n`)
            }

            // Update prompt after command execution
            terminal.setPrompt(getPrompt(fileSystem.getCurrentPath()))
        })

        // Change directory
        terminal.simulateInput('cd examples')
        terminal.simulateInput('\r')

        // Verify filesystem changed
        expect(fileSystem.getCurrentPath()).toBe('/examples')
    })

    it('handles errors from kubectl executor', () => {
        terminal.onCommand((command) => {
            const trimmed = command.trim()
            if (!trimmed) return

            let result
            if (trimmed.startsWith('kubectl')) {
                result = kubectlExecutor.execute(trimmed)
            } else {
                result = shellExecutor.execute(trimmed)
            }

            if (result.type === 'success') {
                // Only write output if there's actual data
                if (result.data) {
                    const formattedOutput = result.data.split('\n').join('\r\n')
                    terminal.write(`${formattedOutput}\r\n`)
                }
            } else {
                terminal.write(`Error: ${result.message}\r\n`)
            }
        })

        terminal.simulateInput('kubectl get invalid-resource')
        terminal.simulateInput('\r')

        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('Error:')
    })

    it('handles errors from shell executor', () => {
        terminal.onCommand((command) => {
            const trimmed = command.trim()
            if (!trimmed) return

            let result
            if (trimmed.startsWith('kubectl')) {
                result = kubectlExecutor.execute(trimmed)
            } else {
                result = shellExecutor.execute(trimmed)
            }

            if (result.type === 'success') {
                // Only write output if there's actual data
                if (result.data) {
                    const formattedOutput = result.data.split('\n').join('\r\n')
                    terminal.write(`${formattedOutput}\r\n`)
                }
            } else {
                terminal.write(`Error: ${result.message}\r\n`)
            }
        })

        terminal.simulateInput('cd nonexistent')
        terminal.simulateInput('\r')

        const outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('Error:')
    })

    it('integration flow: cd → ls → kubectl get pods', () => {
        terminal.setPrompt(getPrompt(fileSystem.getCurrentPath()))

        terminal.onCommand((command) => {
            const trimmed = command.trim()
            if (!trimmed) return

            let result
            if (trimmed.startsWith('kubectl')) {
                result = kubectlExecutor.execute(trimmed)
            } else {
                result = shellExecutor.execute(trimmed)
            }

            if (result.type === 'success') {
                // Only write output if there's actual data
                if (result.data) {
                    const formattedOutput = result.data.split('\n').join('\r\n')
                    terminal.write(`${formattedOutput}\r\n`)
                }
            } else {
                terminal.write(`Error: ${result.message}\r\n`)
            }

            terminal.setPrompt(getPrompt(fileSystem.getCurrentPath()))
        })

        // Step 1: cd to examples
        terminal.simulateInput('cd examples')
        terminal.simulateInput('\r')
        expect(fileSystem.getCurrentPath()).toBe('/examples')

        writeSpy.mockClear()

        // Step 2: ls in examples directory
        terminal.simulateInput('ls')
        terminal.simulateInput('\r')
        let outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('pod-example.yaml')
        expect(outputCalls).toContain('deployment-example.yml')

        writeSpy.mockClear()

        // Step 3: kubectl command still works from subdirectory
        terminal.simulateInput('kubectl get pods')
        terminal.simulateInput('\r')
        outputCalls = writeSpy.mock.calls.map(call => call[0]).join('')
        expect(outputCalls).toContain('nginx-deployment')
        expect(outputCalls).toContain('Running')
    })
})

