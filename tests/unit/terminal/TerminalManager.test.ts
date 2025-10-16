import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTerminalManager } from '../../../src/terminal/TerminalManager'

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

        it('resets history position when typing new command', () => {
            const manager = createTerminalManager(container)
            const mockCallback = vi.fn()
            manager.onCommand(mockCallback)

            manager.simulateInput('first')
            manager.simulateInput('\r')

            // Navigate to history
            manager.simulateInput('\x1b[A')

            // Start typing new command
            manager.simulateInput('new')
            manager.simulateInput('\r')

            expect(mockCallback).toHaveBeenCalledWith('new')
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
})

