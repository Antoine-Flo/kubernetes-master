import type { ClusterStateData } from '../cluster/ClusterState'
import type { EventBus } from '../cluster/events/EventBus'
import { createSeedCluster } from '../cluster/seedCluster'
import type { StorageAdapter } from '../cluster/storage/storageAdapter'
import { createHostFileSystem } from '../filesystem/debianFileSystem'
import type { FileSystemState } from '../filesystem/FileSystem'

// ═══════════════════════════════════════════════════════════════════════════
// RESET BUTTON UI COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
// Factory function that creates a reset button with dropdown menu and
// confirmation modal. Allows resetting cluster, filesystem, or both.

export interface ResetButtonDependencies {
    storage: StorageAdapter
    clusterStateKey: string
    fileSystemKey: string
    eventBus: EventBus
    onReset: (type: 'cluster' | 'filesystem' | 'all') => void
}

interface ResetButton {
    destroy: () => void
}

export const createResetButton = (
    container: HTMLElement,
    deps: ResetButtonDependencies
): ResetButton => {
    const { storage, clusterStateKey, fileSystemKey, eventBus, onReset } = deps

    // Create dropdown structure
    const dropdownDiv = document.createElement('div')
    dropdownDiv.className = 'dropdown dropdown-end'

    // Create button
    const button = document.createElement('button')
    button.className = 'btn btn-sm btn-ghost opacity-40 hover:opacity-100 transition-opacity'
    button.setAttribute('tabindex', '0')
    button.setAttribute('role', 'button')
    button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Reset
    `

    // Create dropdown menu
    const menuUl = document.createElement('ul')
    menuUl.className = 'dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow'
    menuUl.setAttribute('tabindex', '0')

    const menuItems = [
        { label: 'Reset Cluster', value: 'cluster', desc: 'Reset to seed data, keep filesystem' },
        { label: 'Reset Filesystem', value: 'filesystem', desc: 'Reset filesystem only' },
        { label: 'Reset All', value: 'all', desc: 'Reset cluster and filesystem' }
    ]

    menuItems.forEach((item) => {
        const li = document.createElement('li')
        const a = document.createElement('a')
        a.className = 'text-sm'
        a.innerHTML = `
            <div>
                <div class="font-medium">${item.label}</div>
                <div class="text-xs opacity-60">${item.desc}</div>
            </div>
        `
        a.onclick = () => showConfirmModal(item.value as 'cluster' | 'filesystem' | 'all')
        li.appendChild(a)
        menuUl.appendChild(li)
    })

    dropdownDiv.appendChild(button)
    dropdownDiv.appendChild(menuUl)
    container.appendChild(dropdownDiv)

    // Create confirmation modal
    const modal = document.createElement('dialog')
    modal.id = 'reset-confirm-modal'
    modal.className = 'modal'

    const modalBox = document.createElement('div')
    modalBox.className = 'modal-box'

    const modalTitle = document.createElement('h3')
    modalTitle.className = 'font-bold text-lg'
    modalTitle.textContent = 'Confirm Reset'

    const modalText = document.createElement('p')
    modalText.className = 'py-4'
    modalText.id = 'modal-text'

    const modalActions = document.createElement('div')
    modalActions.className = 'modal-action'

    const confirmBtn = document.createElement('button')
    confirmBtn.className = 'btn btn-error'
    confirmBtn.textContent = 'Reset'
    confirmBtn.id = 'confirm-reset-btn'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'btn'
    cancelBtn.textContent = 'Cancel'
    cancelBtn.onclick = () => modal.close()

    modalActions.appendChild(confirmBtn)
    modalActions.appendChild(cancelBtn)

    modalBox.appendChild(modalTitle)
    modalBox.appendChild(modalText)
    modalBox.appendChild(modalActions)

    const modalBackdrop = document.createElement('form')
    modalBackdrop.method = 'dialog'
    modalBackdrop.className = 'modal-backdrop'
    const backdropBtn = document.createElement('button')
    backdropBtn.textContent = 'close'
    modalBackdrop.appendChild(backdropBtn)

    modal.appendChild(modalBox)
    modal.appendChild(modalBackdrop)
    document.body.appendChild(modal)

    // Show confirmation modal
    const showConfirmModal = (type: 'cluster' | 'filesystem' | 'all') => {
        const messages = {
            cluster: 'This will reset the cluster to seed data. Your filesystem will not be affected.',
            filesystem: 'This will reset the filesystem to its initial state. Your cluster data will not be affected.',
            all: 'This will reset both cluster and filesystem to their initial states. All your changes will be lost.'
        }

        modalText.textContent = messages[type]

        // Replace confirm button to clear old listeners
        const newConfirmBtn = confirmBtn.cloneNode(true) as HTMLButtonElement
        confirmBtn.parentNode?.replaceChild(newConfirmBtn, confirmBtn)

        newConfirmBtn.onclick = () => {
            performReset(type)
            modal.close()
        }

        modal.showModal()
    }

    // Perform reset operation
    const performReset = (type: 'cluster' | 'filesystem' | 'all') => {
        if (type === 'cluster' || type === 'all') {
            const seedClusterData: ClusterStateData = createSeedCluster(eventBus).toJSON()
            storage.save(clusterStateKey, seedClusterData)
        }

        if (type === 'filesystem' || type === 'all') {
            const hostFileSystem: FileSystemState = createHostFileSystem()
            storage.save(fileSystemKey, hostFileSystem)
        }

        // Call onReset callback
        onReset(type)

        // Show success message and reload
        showSuccessAndReload(type)
    }

    // Show success message and reload page
    const showSuccessAndReload = (type: string) => {
        const typeLabel = type === 'all' ? 'cluster and filesystem' : type

        // Create temporary success toast
        const toast = document.createElement('div')
        toast.className = 'toast toast-top toast-center z-50'
        toast.innerHTML = `
            <div class="alert alert-success">
                <span>✓ ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} reset successfully!</span>
            </div>
        `
        document.body.appendChild(toast)

        // Reload after short delay
        setTimeout(() => {
            window.location.reload()
        }, 800)
    }

    // Cleanup function
    const destroy = () => {
        container.removeChild(dropdownDiv)
        document.body.removeChild(modal)
    }

    return { destroy }
}

