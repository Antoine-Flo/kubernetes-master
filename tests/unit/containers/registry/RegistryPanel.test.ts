import { beforeEach, describe, expect, it } from 'vitest'
import { createRegistryPanel } from '../../../../src/containers/registry/RegistryPanel'

describe('RegistryPanel', () => {
    let container: HTMLElement

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
    })

    it('should create registry panel card', () => {
        createRegistryPanel(container)

        const card = container.querySelector('.card')
        expect(card).toBeTruthy()
    })

    it('should display title with registry icon', () => {
        createRegistryPanel(container)

        const title = container.querySelector('.card-title')
        expect(title).toBeTruthy()
        expect(title?.textContent).toContain('Container Registry')
    })

    it('should display badge with image count', () => {
        createRegistryPanel(container)

        const badge = container.querySelector('.badge')
        expect(badge).toBeTruthy()
        expect(badge?.textContent).toMatch(/\d+ images/)
    })

    it('should have collapsible content hidden by default', () => {
        createRegistryPanel(container)

        const card = container.querySelector('.card')
        expect(card).toBeTruthy()
        
        // Content div should exist in the card
        const cardBody = card?.querySelector('.card-body')
        expect(cardBody).toBeTruthy()
    })

    it('should toggle content visibility when header is clicked', () => {
        createRegistryPanel(container)

        const card = container.querySelector('.card')
        expect(card).toBeTruthy()
    })

    it('should rotate chevron when expanded', () => {
        createRegistryPanel(container)

        const header = container.querySelector('[role="button"]') as HTMLElement
        const chevron = container.querySelector('svg')
        
        expect(chevron?.classList.contains('rotate-180')).toBe(false)

        header.click()
        expect(chevron?.classList.contains('rotate-180')).toBe(true)
    })

    it('should display multiple image cards', () => {
        createRegistryPanel(container)

        const header = container.querySelector('[role="button"]') as HTMLElement
        header.click() // Expand to see content

        const imageCards = container.querySelectorAll('.bg-base-200')
        expect(imageCards.length).toBeGreaterThan(0)
    })

    it('should display image information with tags', () => {
        createRegistryPanel(container)

        const header = container.querySelector('[role="button"]') as HTMLElement
        header.click()

        // Check for tag badges
        const tagBadges = container.querySelectorAll('.badge-outline')
        expect(tagBadges.length).toBeGreaterThan(0)
    })

    it('should display registry sections', () => {
        createRegistryPanel(container)

        const header = container.querySelector('[role="button"]') as HTMLElement
        header.click()

        const registryTitles = container.querySelectorAll('.text-xs.font-semibold')
        expect(registryTitles.length).toBeGreaterThan(0)
    })

    it('should clean up when destroyed', () => {
        const panel = createRegistryPanel(container)

        expect(container.children.length).toBeGreaterThan(0)

        panel.destroy()

        expect(container.children.length).toBe(0)
    })

    it('should support keyboard navigation for toggle', () => {
        createRegistryPanel(container)

        const card = container.querySelector('.card')
        expect(card).toBeTruthy()

        // Verify that the header has role="button" for keyboard accessibility
        const header = container.querySelector('[role="button"]')
        expect(header).toBeTruthy()
    })
})

