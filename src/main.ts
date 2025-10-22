import type { ClusterStateData } from './cluster/ClusterState'
import { createEventBus } from './cluster/events/EventBus'
import { createSeedCluster } from './cluster/seedCluster'
import { createAutoSaveClusterState, createAutoSaveFileSystem } from './cluster/storage/autoSave'
import { createStorageAdapter } from './cluster/storage/storageAdapter'
import { createEditorModal } from './editor/EditorModal'
import type { FileSystemState } from './filesystem/FileSystem'
import { createSeedFileSystem } from './filesystem/seedFileSystem'
import { createKubectlExecutor } from './kubectl/commands/executor'
import { createLogger } from './logger/Logger'
import { createShellExecutor } from './shell/commands/executor'
import './style.css'
import { createTerminalManager } from './terminal/TerminalManager'

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                      KUBECTL SIMULATOR - MAIN                         ║
// ╚═══════════════════════════════════════════════════════════════════════╝
// Entry point for the Kube Simulator application.
// Initializes terminal, cluster state, and command execution with persistence.

const CLUSTER_STATE_KEY = 'kube-simulator:cluster-state'
const FILESYSTEM_STATE_KEY = 'kube-simulator:filesystem-state'

const terminalContainer = document.getElementById('terminal')

if (!terminalContainer) {
    throw new Error('Terminal container not found')
}

// Initialize storage adapter
const storage = createStorageAdapter()

// Create EventBus for event-driven architecture
const eventBus = createEventBus({ enableHistory: true, maxHistorySize: 1000 })

// Initialize cluster state: Load from storage or use seed data
const loadedClusterState = storage.load<ClusterStateData>(CLUSTER_STATE_KEY)
const clusterStateData = loadedClusterState.ok ? loadedClusterState.value : createSeedCluster().toJSON()
const clusterState = createAutoSaveClusterState(storage, CLUSTER_STATE_KEY, clusterStateData, eventBus)

// Initialize filesystem: Load from storage or use seed data
const loadedFileSystemState = storage.load<FileSystemState>(FILESYSTEM_STATE_KEY)
const fileSystemState = loadedFileSystemState.ok ? loadedFileSystemState.value : createSeedFileSystem()
const fileSystem = createAutoSaveFileSystem(storage, FILESYSTEM_STATE_KEY, fileSystemState)

// Create logger
const logger = createLogger({ mirrorToConsole: true })

// Subscribe logger to all events for centralized logging
eventBus.subscribeAll((event) => {
    const eventInfo = `${event.type} - ${JSON.stringify(event.payload).substring(0, 100)}...`
    logger.info('CLUSTER', eventInfo)
})

// Create editor modal
const editorModalContainer = document.createElement('div')
editorModalContainer.id = 'editor-modal-container'
document.body.appendChild(editorModalContainer)
const editorModal = createEditorModal(editorModalContainer)

// Create kubectl executor with EventBus
const kubectlExecutor = createKubectlExecutor(clusterState, fileSystem, logger, eventBus)

// Create shell executor
const shellExecutor = createShellExecutor(fileSystem, logger, editorModal)

// Initialize terminal with autocomplete context
const terminal = createTerminalManager(terminalContainer, {
    clusterState,
    fileSystem
})

// Welcome message
terminal.write('\x1b[36m☸ Kube Simulator\x1b[0m - Learn kubectl hands-on\r\n')
terminal.write('\r\n')
terminal.write('Try: \x1b[33mkubectl get pods\x1b[0m or \x1b[33mkubectl logs <pod>\x1b[0m\r\n')
terminal.write('Tip: Press \x1b[32mTab\x1b[0m to autocomplete, \x1b[32m↑↓\x1b[0m for history\r\n')
terminal.write('\r\n')
// Helper: Generate dynamic prompt based on current path
const getPrompt = (currentPath: string): string => {
    if (currentPath === '/') {
        return '☸ /> '
    }
    return `☸ ~${currentPath}> `
}

// Update prompt initially
terminal.setPrompt(getPrompt(fileSystem.getCurrentPath()))

// Show prompt and focus terminal
terminal.showPrompt()
terminal.focus()

// Handle commands with dispatcher
terminal.onCommand((command) => {
    const trimmed = command.trim()

    // Handle empty commands
    if (!trimmed) {
        return
    }

    let result

    // Route to appropriate executor
    if (trimmed.startsWith('kubectl')) {
        result = kubectlExecutor.execute(trimmed)
    } else {
        result = shellExecutor.execute(trimmed)
    }

    // Display result (stdout/stderr)
    if (result.ok) {
        // Only write output if there's actual data
        if (result.value) {
            const formattedOutput = result.value.split('\n').join('\r\n')
            terminal.write(`${formattedOutput}\r\n`)
        }
    } else {
        terminal.write(`Error: ${result.error}\r\n`)
    }

    // Update prompt after command execution (path might have changed)
    terminal.setPrompt(getPrompt(fileSystem.getCurrentPath()))
})
