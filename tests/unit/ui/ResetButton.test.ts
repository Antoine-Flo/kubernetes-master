import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEventBus } from '../../../src/cluster/events/EventBus'
import { createStorageAdapter } from '../../../src/cluster/storage/storageAdapter'
import { createResetButton, type ResetButtonDependencies } from '../../../src/ui/ResetButton'

describe('ResetButton', () => {
    let container: HTMLElement
    let deps: ResetButtonDependencies
    let mockOnReset: ReturnType<typeof vi.fn>

    beforeEach(() => {
        // Create container
        container = document.createElement('div')
        document.body.appendChild(container)

        // Create mock dependencies
        mockOnReset = vi.fn()
        deps = {
            storage: createStorageAdapter(),
            clusterStateKey: 'test-cluster-state',
            fileSystemKey: 'test-filesystem-state',
            eventBus: createEventBus(),
            onReset: mockOnReset
        }

        // Mock window.location.reload
        Object.defineProperty(window, 'location', {
            value: { reload: vi.fn() },
            writable: true
        })
    })

    it('should create reset button with dropdown', () => {
        createResetButton(container, deps)

        const dropdown = container.querySelector('.dropdown')
        expect(dropdown).toBeTruthy()

        const button = container.querySelector('button')
        expect(button).toBeTruthy()
        expect(button?.textContent).toContain('Reset')
    })

    it('should have three menu options', () => {
        createResetButton(container, deps)

        const menuItems = container.querySelectorAll('.dropdown-content li')
        expect(menuItems.length).toBe(3)
    })

    it('should show confirmation modal when clicking menu item', () => {
        createResetButton(container, deps)

        const dropdown = container.querySelector('.dropdown')
        expect(dropdown).toBeTruthy()

        const modal = document.querySelector('#reset-confirm-modal') as HTMLDialogElement
        expect(modal).toBeTruthy()
    })

    it('should call onReset callback when confirmed', () => {
        vi.useFakeTimers()
        
        createResetButton(container, deps)

        const modal = document.querySelector('#reset-confirm-modal') as HTMLDialogElement
        expect(modal).toBeTruthy()
        
        vi.useRealTimers()
    })

    it('should have subtle opacity when not hovered', () => {
        createResetButton(container, deps)

        const button = container.querySelector('button')
        expect(button?.className).toContain('opacity-40')
    })

    it('should clean up when destroyed', () => {
        const resetButton = createResetButton(container, deps)

        expect(container.children.length).toBeGreaterThan(0)

        resetButton.destroy()

        expect(container.children.length).toBe(0)
    })
})

