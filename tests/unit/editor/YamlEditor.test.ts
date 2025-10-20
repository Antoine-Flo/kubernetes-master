import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createYamlEditor } from '../../../src/editor/YamlEditor'

describe('YamlEditor', () => {
    let container: HTMLElement

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
    })

    afterEach(() => {
        document.body.removeChild(container)
    })

    it('should create editor instance', () => {
        const editor = createYamlEditor()
        expect(editor).toBeDefined()
        expect(editor.mount).toBeDefined()
        expect(editor.setValue).toBeDefined()
        expect(editor.getValue).toBeDefined()
        expect(editor.focus).toBeDefined()
        expect(editor.destroy).toBeDefined()
        expect(editor.onChange).toBeDefined()
    })

    it('should mount editor to container', () => {
        const editor = createYamlEditor()
        editor.mount(container)

        // CodeMirror should add elements to container
        expect(container.children.length).toBeGreaterThan(0)

        editor.destroy()
    })

    it('should set and get value', () => {
        const editor = createYamlEditor()
        editor.mount(container)

        const content = 'apiVersion: v1\nkind: Pod'
        editor.setValue(content)

        const value = editor.getValue()
        expect(value).toBe(content)

        editor.destroy()
    })

    it('should return empty string when not mounted', () => {
        const editor = createYamlEditor()
        const value = editor.getValue()
        expect(value).toBe('')
    })

    it('should handle setValue when not mounted', () => {
        const editor = createYamlEditor()
        // Should not throw
        expect(() => editor.setValue('test')).not.toThrow()
    })

    it('should handle focus when not mounted', () => {
        const editor = createYamlEditor()
        // Should not throw
        expect(() => editor.focus()).not.toThrow()
    })

    it('should destroy editor cleanly', () => {
        const editor = createYamlEditor()
        editor.mount(container)

        expect(container.children.length).toBeGreaterThan(0)

        editor.destroy()

        // Container should be empty after destroy
        expect(container.children.length).toBe(0)
    })

    it('should handle multiple destroy calls', () => {
        const editor = createYamlEditor()
        editor.mount(container)

        editor.destroy()
        // Should not throw on second destroy
        expect(() => editor.destroy()).not.toThrow()
    })

    it('should register onChange callback', () => {
        const editor = createYamlEditor()
        editor.mount(container)

        let changeCount = 0

        editor.onChange(() => {
            changeCount++
        })

        // Note: We can't easily trigger CodeMirror changes in jsdom
        // This test just verifies the API exists
        expect(changeCount).toBe(0)

        editor.destroy()
    })

    it('should accept onSave option', () => {
        let saveCalled = false

        const editor = createYamlEditor({
            onSave: () => {
                saveCalled = true
            }
        })

        editor.mount(container)

        // Note: We can't easily trigger Ctrl+S in jsdom
        // This test just verifies the option is accepted
        expect(saveCalled).toBe(false)

        editor.destroy()
    })

    it('should remount after destroy', () => {
        const editor = createYamlEditor()

        editor.mount(container)
        expect(container.children.length).toBeGreaterThan(0)

        editor.destroy()
        expect(container.children.length).toBe(0)

        // Should be able to remount
        editor.mount(container)
        expect(container.children.length).toBeGreaterThan(0)

        editor.destroy()
    })
})

