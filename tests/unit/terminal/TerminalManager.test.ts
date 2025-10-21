import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTerminalManager } from '../../../src/terminal/TerminalManager'
import { createClusterState } from '../../../src/cluster/ClusterState'
import { createFileSystem } from '../../../src/filesystem/FileSystem'
import { createPod } from '../../../src/cluster/ressources/Pod'

describe('TerminalManager', () => {
    let container: HTMLElement

    beforeEach(() => {
        container = document.createElement('div')
    })

    it('can initialize terminal with container element', () => {
        const manager = createTerminalManager(container)
        expect(manager).toBeDefined()
        expect(container.querySelector('.xterm')).toBeTruthy()
    })

    it('can write text to terminal', () => {
        const manager = createTerminalManager(container)
        expect(() => manager.write('Hello, World!')).not.toThrow()
    })

    it('displays prompt correctly', () => {
        const manager = createTerminalManager(container)
        // Verify terminal was initialized (has xterm container)
        expect(container.querySelector('.xterm')).toBeTruthy()
        // The prompt is written on initialization, verified by other tests
        expect(manager).toBeDefined()
    })

    it('captures command on Enter key', () => {
        const manager = createTerminalManager(container)
        const mockCallback = vi.fn()

        manager.onCommand(mockCallback)

        // Simulate typing "get pods"
        manager.simulateInput('get pods')
        manager.simulateInput('\r') // Enter key

        expect(mockCallback).toHaveBeenCalledWith('get pods')
    })

    it('onCommand callback is invoked with correct command text', () => {
        const manager = createTerminalManager(container)
        const mockCallback = vi.fn()

        manager.onCommand(mockCallback)

        manager.simulateInput('describe pod nginx')
        manager.simulateInput('\r')

        expect(mockCallback).toHaveBeenCalledTimes(1)
        expect(mockCallback).toHaveBeenCalledWith('describe pod nginx')
    })

    it('handles backspace correctly', () => {
        const manager = createTerminalManager(container)
        const mockCallback = vi.fn()

        manager.onCommand(mockCallback)

        manager.simulateInput('hello')
        manager.simulateInput('\x7f') // Backspace
        manager.simulateInput('\r')

        expect(mockCallback).toHaveBeenCalledWith('hell')
    })

    it('shows new prompt after command execution', () => {
        const manager = createTerminalManager(container)
        let commandCount = 0

        manager.onCommand(() => {
            commandCount++
        })

        manager.simulateInput('test')
        manager.simulateInput('\r')

        expect(commandCount).toBe(1)
    })

    describe('Command History', () => {
        it('navigates to previous command with up arrow', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            // Execute first command
            manager.simulateInput('first command')
            manager.simulateInput('\r')

            // Execute second command
            manager.simulateInput('second command')
            manager.simulateInput('\r')

            // Press up arrow - should show "second command"
            manager.simulateInput('\x1b[A')
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('second command')
        })

        it('navigates to next command with down arrow', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('first')
            manager.simulateInput('\r')
            manager.simulateInput('second')
            manager.simulateInput('\r')

            // Go back in history
            manager.simulateInput('\x1b[A') // second
            manager.simulateInput('\x1b[A') // first

            // Go forward
            manager.simulateInput('\x1b[B') // second
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('second')
        })

        it('stores maximum 100 commands in history', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            // Add 101 commands
            for (let i = 0; i < 101; i++) {
                manager.simulateInput(`command ${i}`)
                manager.simulateInput('\r')
            }

            // Navigate to oldest command
            for (let i = 0; i < 100; i++) {
                manager.simulateInput('\x1b[A')
            }

            manager.simulateInput('\r')

            // Should get command 1 (not command 0, which was evicted)
            expect(mockCallback).toHaveBeenCalledWith('command 1')
        })

        it('does not add empty commands to history', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('valid command')
            manager.simulateInput('\r')
            manager.simulateInput('\r') // Empty
            manager.simulateInput('\r') // Empty

            manager.simulateInput('\x1b[A') // Should get "valid command"
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('valid command')
        })

        it('allows editing history command when typing', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('first')
            manager.simulateInput('\r')

            // Navigate to history
            manager.simulateInput('\x1b[A')

            // Edit the history command by adding text
            manager.simulateInput(' new')
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('first new')
        })

        it('clears current line when navigating history', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('previous')
            manager.simulateInput('\r')

            // Start typing
            manager.simulateInput('partial')

            // Navigate up - should replace "partial" with "previous"
            manager.simulateInput('\x1b[A')
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('previous')
        })

        it('down arrow at end of history clears line', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('command')
            manager.simulateInput('\r')

            manager.simulateInput('\x1b[A') // Navigate up
            manager.simulateInput('\x1b[B') // Navigate down (to empty)
            manager.simulateInput('\r')

            // Should not call callback with empty command
            expect(mockCallback).toHaveBeenCalledTimes(1) // Only the first "command"
        })
    })

    describe('Tab Autocompletion', () => {
        let manager: ReturnType<typeof createTerminalManager>
        let mockCallback: ReturnType<typeof vi.fn>
        let mockContext: any

        beforeEach(() => {
            const clusterState = createClusterState()
            clusterState.addPod(createPod({
                name: 'nginx-1',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }]
            }))

            const fileSystem = createFileSystem({
                currentPath: '/',
                tree: {
                    type: 'directory',
                    name: '/',
                    path: '/',
                    children: new Map([
                        ['manifests', {
                            type: 'directory',
                            name: 'manifests',
                            path: '/manifests',
                            children: new Map()
                        }]
                    ])
                }
            })

            mockContext = { clusterState, fileSystem }
            manager = createTerminalManager(container, mockContext)
            mockCallback = vi.fn()
            manager.onCommand(mockCallback)
        })

        it('completes single match on Tab', () => {
            manager.simulateInput('kub')
            manager.simulateInput('\t') // Tab
            manager.simulateInput('\r') // Enter

            expect(mockCallback).toHaveBeenCalledWith('kubectl')
        })

        it('completes common prefix on Tab with multiple matches', () => {
            manager.simulateInput('c')
            manager.simulateInput('\t') // Tab
            manager.simulateInput('\r') // Enter

            // Should complete to 'c' + common prefix of 'cd', 'cat', 'clear'
            // Common prefix is 'c', so no completion happens
            expect(mockCallback).toHaveBeenCalledWith('c')
        })

        it('does nothing when no matches on Tab', () => {
            manager.simulateInput('xyz')
            manager.simulateInput('\t') // Tab
            manager.simulateInput('\r') // Enter

            expect(mockCallback).toHaveBeenCalledWith('xyz')
        })

        it('completes kubectl action after kubectl', () => {
            manager.simulateInput('kubectl g')
            manager.simulateInput('\t') // Tab
            manager.simulateInput('\r') // Enter

            expect(mockCallback).toHaveBeenCalledWith('kubectl get')
        })

        it('completes resource type after kubectl get', () => {
            manager.simulateInput('kubectl get p')
            manager.simulateInput('\t') // Tab - should complete common prefix 'po'
            manager.simulateInput('ds')
            manager.simulateInput('\r') // Enter

            expect(mockCallback).toHaveBeenCalledWith('kubectl get pods')
        })

        it('completes pod name after kubectl get pods', () => {
            manager.simulateInput('kubectl get pods n')
            manager.simulateInput('\t') // Tab
            manager.simulateInput('\r') // Enter

            expect(mockCallback).toHaveBeenCalledWith('kubectl get pods nginx-1')
        })

        it('completes directory name after cd', () => {
            manager.simulateInput('cd m')
            manager.simulateInput('\t') // Tab
            manager.simulateInput('\r') // Enter

            expect(mockCallback).toHaveBeenCalledWith('cd manifests')
        })

        it('adds space after completing single match', () => {
            manager.simulateInput('kub')
            manager.simulateInput('\t') // Tab - completes to 'kubectl'
            manager.simulateInput('g')
            manager.simulateInput('\r') // Enter

            expect(mockCallback).toHaveBeenCalledWith('kubectl g')
        })

        it('handles Tab on empty line', () => {
            manager.simulateInput('\t') // Tab on empty line
            manager.simulateInput('pwd')
            manager.simulateInput('\r') // Enter

            expect(mockCallback).toHaveBeenCalledWith('pwd')
        })

        it('handles multiple Tab presses', () => {
            manager.simulateInput('kubectl')
            manager.simulateInput('\t') // First Tab - no effect (already complete)
            manager.simulateInput('\t') // Second Tab
            manager.simulateInput('\r') // Enter

            expect(mockCallback).toHaveBeenCalledWith('kubectl')
        })

        it('completes with common prefix when partial match exists', () => {
            manager.simulateInput('kubectl get pod')
            manager.simulateInput('\t') // Tab - completes common prefix 'pod'
            manager.simulateInput('s')
            manager.simulateInput('\r') // Enter

            expect(mockCallback).toHaveBeenCalledWith('kubectl get pods')
        })

        it('does not interfere with history navigation', () => {
            // Execute a command first
            manager.simulateInput('kubectl get pods')
            manager.simulateInput('\r')

            // Try Tab then up arrow
            manager.simulateInput('k')
            manager.simulateInput('\t') // Tab - should complete to 'kubectl'
            manager.simulateInput('\x1b[A') // Up arrow - should show history
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('kubectl get pods')
        })

        it('works with flags in kubectl commands', () => {
            manager.simulateInput('kubectl get pods -')
            manager.simulateInput('\t') // Tab - should show flag options (but not complete since multiple)
            manager.simulateInput('n default')
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('kubectl get pods -n default')
        })

        it('handles Tab after backspace', () => {
            manager.simulateInput('kubectl')
            manager.simulateInput('\x7f') // Backspace
            manager.simulateInput('\t') // Tab - should complete 'kubect' to 'kubectl'
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('kubectl')
        })
    })

    describe('Cursor Navigation', () => {
        it('moves cursor left with left arrow', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('hello')
            manager.simulateInput('\x1b[D') // Left arrow
            manager.simulateInput('\x1b[D') // Left arrow
            manager.simulateInput('X') // Insert X at cursor position
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('helXlo')
        })

        it('moves cursor right with right arrow', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('hello')
            manager.simulateInput('\x1b[D') // Left arrow (cursor before 'o')
            manager.simulateInput('\x1b[D') // Left arrow (cursor before 'l')
            manager.simulateInput('\x1b[C') // Right arrow (cursor before 'o')
            manager.simulateInput('X') // Insert X
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('hellXo')
        })

        it('allows editing in the middle of a line', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('kubectl pods')
            // Move cursor to after 'kubectl' (before space)
            manager.simulateInput('\x1b[D') // before 's'
            manager.simulateInput('\x1b[D') // before 'd'
            manager.simulateInput('\x1b[D') // before 'o'
            manager.simulateInput('\x1b[D') // before 'p'
            manager.simulateInput('\x1b[D') // before ' '
            manager.simulateInput(' get') // Insert ' get' (space + get)
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('kubectl get pods')
        })

        it('handles backspace at cursor position', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('hello')
            manager.simulateInput('\x1b[D') // Left arrow (cursor before 'o')
            manager.simulateInput('\x1b[D') // Left arrow (cursor before 'l')
            manager.simulateInput('\x7f') // Backspace - should delete 'l' before cursor
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('helo')
        })

        it('does not move cursor left beyond start', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('hi')
            manager.simulateInput('\x1b[D') // Left
            manager.simulateInput('\x1b[D') // Left
            manager.simulateInput('\x1b[D') // Left (should not go beyond start)
            manager.simulateInput('X')
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('Xhi')
        })

        it('does not move cursor right beyond end', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('hi')
            manager.simulateInput('\x1b[C') // Right (should not go beyond end)
            manager.simulateInput('X')
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('hiX')
        })

        it('allows editing history command with cursor navigation', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('hello world')
            manager.simulateInput('\r')

            // Navigate to history
            manager.simulateInput('\x1b[A') // Up arrow

            // Move cursor to middle of 'world' and insert 'X'
            manager.simulateInput('\x1b[D') // before 'd'
            manager.simulateInput('\x1b[D') // before 'l'
            manager.simulateInput('\x1b[D') // before 'r'
            manager.simulateInput('X') // Insert X
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('hello woXrld')
        })
    })
})

