import { createYamlEditor, type YamlEditor } from './YamlEditor'
import { validateYaml } from './validation'

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR MODAL
// ═══════════════════════════════════════════════════════════════════════════
// Factory function for managing a modal overlay with CodeMirror YAML editor.
// Uses daisyUI modal components for styling.

export interface EditorModal {
    open: (filename: string, content: string, onSave: (content: string) => void) => void
    close: () => void
}

/**
 * Create an editor modal
 * @param containerElement - DOM element to mount the modal
 * @returns EditorModal API
 */
export const createEditorModal = (containerElement: HTMLElement): EditorModal => {
    let editor: YamlEditor | null = null
    let saveCallback: ((content: string) => void) | null = null
    let modalElement: HTMLElement | null = null
    let statusElement: HTMLElement | null = null

    const handleSave = () => {
        if (!editor || !saveCallback) return

        const content = editor.getValue()
        const validation = validateYaml(content)

        if (!validation.ok) {
            updateStatus(`Error: ${validation.error}`, 'error')
            return
        }

        saveCallback(content)
        updateStatus('File saved successfully', 'success')

        // Close modal after short delay
        setTimeout(() => {
            close()
        }, 500)
    }

    const updateStatus = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
        if (!statusElement) return

        const colorClass = type === 'error' ? 'text-error' : type === 'success' ? 'text-success' : 'text-info'
        statusElement.className = `text-sm ${colorClass}`
        statusElement.textContent = message
    }

    const handleChange = (content: string) => {
        const validation = validateYaml(content)
        if (!validation.ok) {
            updateStatus(`YAML error: ${validation.error}`, 'error')
        } else {
            updateStatus('Valid YAML', 'success')
        }
    }

    const close = () => {
        if (modalElement) {
            modalElement.classList.remove('modal-open')
        }

        if (editor) {
            editor.destroy()
            editor = null
        }

        saveCallback = null
    }

    const createModalHTML = () => {
        modalElement = document.createElement('div')
        modalElement.className = 'modal'
        modalElement.innerHTML = `
            <div class="modal-box w-11/12 max-w-5xl h-[90vh] flex flex-col p-0">
                <!-- Header -->
                <div class="flex items-center justify-between px-6 py-4 border-b border-base-300">
                    <div class="flex items-center gap-3">
                        <span class="text-lg font-mono">📝</span>
                        <div>
                            <h3 class="font-bold text-lg" id="editor-filename"></h3>
                            <p class="text-xs text-base-content/60">YAML Editor</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-success btn-sm" id="editor-save-btn">
                            <span class="text-xs">💾 Save</span>
                            <kbd class="kbd kbd-xs">Ctrl+S</kbd>
                        </button>
                        <button class="btn btn-ghost btn-sm" id="editor-close-btn">
                            <span class="text-xs">✕ Close</span>
                            <kbd class="kbd kbd-xs">Esc</kbd>
                        </button>
                    </div>
                </div>

                <!-- Editor Container -->
                <div class="flex-1 overflow-hidden" id="editor-container"></div>

                <!-- Footer Status -->
                <div class="px-6 py-3 border-t border-base-300 bg-base-200">
                    <p class="text-sm text-info" id="editor-status">Ready</p>
                </div>
            </div>
        `

        containerElement.appendChild(modalElement)

        // Setup event listeners
        const saveBtn = modalElement.querySelector('#editor-save-btn')
        const closeBtn = modalElement.querySelector('#editor-close-btn')
        statusElement = modalElement.querySelector('#editor-status')

        saveBtn?.addEventListener('click', handleSave)
        closeBtn?.addEventListener('click', close)

        // Esc to close
        modalElement.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                close()
            }
        })
    }

    const open = (filename: string, content: string, onSave: (content: string) => void) => {
        saveCallback = onSave

        // Create modal if not exists
        if (!modalElement) {
            createModalHTML()
        }

        // Update filename in header
        const filenameEl = modalElement?.querySelector('#editor-filename')
        if (filenameEl) {
            filenameEl.textContent = filename
        }

        // Create and mount editor
        const editorContainer = modalElement?.querySelector('#editor-container') as HTMLElement
        if (editorContainer) {
            editor = createYamlEditor({ onSave: handleSave })
            editor.mount(editorContainer)
            editor.setValue(content)
            editor.onChange(handleChange)

            // Initial validation
            setTimeout(() => {
                handleChange(content)
            }, 100)

            // Focus editor
            setTimeout(() => {
                editor?.focus()
            }, 200)
        }

        // Show modal
        if (modalElement) {
            modalElement.classList.add('modal-open')
        }
    }

    return {
        open,
        close,
    }
}

