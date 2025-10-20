import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { yaml } from '@codemirror/lang-yaml'
import { oneDark } from '@codemirror/theme-one-dark'

// ═══════════════════════════════════════════════════════════════════════════
// YAML EDITOR (CodeMirror 6)
// ═══════════════════════════════════════════════════════════════════════════
// Factory function for creating a CodeMirror-based YAML editor.
// Provides a clean API for mounting, updating, and destroying the editor.

export interface YamlEditor {
    mount: (container: HTMLElement) => void
    setValue: (content: string) => void
    getValue: () => string
    focus: () => void
    destroy: () => void
    onChange: (callback: (value: string) => void) => void
}

interface YamlEditorOptions {
    onSave?: () => void
}

/**
 * Create a YAML editor using CodeMirror 6
 * @param options - Editor options (onSave callback for Ctrl+S)
 * @returns YamlEditor API
 */
export const createYamlEditor = (options: YamlEditorOptions = {}): YamlEditor => {
    let view: EditorView | null = null
    let changeCallback: ((value: string) => void) | null = null

    const createEditorState = (initialContent: string) => {
        const extensions = [
            yaml(),
            oneDark,
            keymap.of([
                ...defaultKeymap,
                indentWithTab,
                {
                    key: 'Ctrl-s',
                    run: () => {
                        if (options.onSave) {
                            options.onSave()
                        }
                        return true
                    },
                },
            ]),
            EditorView.updateListener.of((update) => {
                if (update.docChanged && changeCallback) {
                    changeCallback(update.state.doc.toString())
                }
            }),
        ]

        return EditorState.create({
            doc: initialContent,
            extensions,
        })
    }

    return {
        mount: (container: HTMLElement) => {
            if (view) {
                view.destroy()
            }

            const state = createEditorState('')
            view = new EditorView({
                state,
                parent: container,
            })
        },

        setValue: (content: string) => {
            if (!view) return

            const state = createEditorState(content)
            view.setState(state)
        },

        getValue: () => {
            if (!view) return ''
            return view.state.doc.toString()
        },

        focus: () => {
            if (view) {
                view.focus()
            }
        },

        destroy: () => {
            if (view) {
                view.destroy()
                view = null
            }
        },

        onChange: (callback: (value: string) => void) => {
            changeCallback = callback
        },
    }
}

