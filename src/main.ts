import type { ClusterStateData } from './cluster/ClusterState'
import { createEventBus } from './cluster/events/EventBus'
import { createSeedCluster } from './cluster/seedCluster'
import { createAutoSaveClusterState, createAutoSaveFileSystem } from './cluster/storage/autoSave'
import { createStorageAdapter } from './cluster/storage/storageAdapter'
import { createEditorModal } from './editor/EditorModal'
import type { FileSystemState } from './filesystem/FileSystem'
import { createHostFileSystem } from './filesystem/debianFileSystem'
import { createLogger } from './logger/Logger'
import './style.css'
import { createCommandDispatcher } from './terminal/CommandDispatcher'
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

// Initialize filesystem: Load from storage or use host filesystem template
const loadedFileSystemState = storage.load<FileSystemState>(FILESYSTEM_STATE_KEY)
const fileSystemState = loadedFileSystemState.ok ? loadedFileSystemState.value : createHostFileSystem()
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

// Initialize terminal with autocomplete context
const terminal = createTerminalManager(terminalContainer, {
    clusterState,
    fileSystem
})

// Create command dispatcher
const commandDispatcher = createCommandDispatcher(terminal, clusterState, fileSystem, logger, editorModal, eventBus)

// Welcome message
terminal.write('\x1b[36m☸ Kube Simulator\x1b[0m - Learn kubectl hands-on\r\n')
terminal.write('\r\n')
terminal.write('Try: \x1b[33mkubectl get pods\x1b[0m or \x1b[33mkubectl logs <pod>\x1b[0m\r\n')
terminal.write('Tip: Press \x1b[32mTab\x1b[0m to autocomplete, \x1b[32m↑↓\x1b[0m for history\r\n')
terminal.write('\r\n')

// Show prompt and focus terminal
terminal.showPrompt()
terminal.focus()

// Handle commands with dispatcher
terminal.onCommand((command) => {
    commandDispatcher.execute(command)
})
