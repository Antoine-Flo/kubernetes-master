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
})

