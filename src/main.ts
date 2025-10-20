import './style.css'
import { createTerminalManager } from './terminal/TerminalManager'
import { createSeedCluster } from './cluster/seedCluster'
import { createKubectlExecutor } from './kubectl/commands/executor'
import { createLogger } from './logger/Logger'
import { createShellExecutor } from './shell/commands/executor'
import { createSeedFileSystem } from './filesystem/seedFileSystem'
import { createFileSystem } from './filesystem/FileSystem'

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                      KUBECTL SIMULATOR - MAIN                         ║
// ╚═══════════════════════════════════════════════════════════════════════╝
// Entry point for the Kube Simulator application.
// Initializes terminal, cluster state, and command execution.

const terminalContainer = document.getElementById('terminal')

if (!terminalContainer) {
    throw new Error('Terminal container not found')
}

// Initialize cluster state with seed data
const clusterState = createSeedCluster()

// Initialize filesystem with seed data
const fileSystemState = createSeedFileSystem()
const fileSystem = createFileSystem(fileSystemState)

// Create logger
const logger = createLogger({ mirrorToConsole: true })

// Create kubectl executor
const kubectlExecutor = createKubectlExecutor(clusterState, logger)

// Create shell executor
const shellExecutor = createShellExecutor(fileSystem, logger)

// Initialize terminal with autocomplete context
const terminal = createTerminalManager(terminalContainer, {
    clusterState,
    fileSystem
})

// Welcome message
terminal.write('Welcome to Kube Simulator\r\n')
terminal.write('Type kubectl or shell commands to interact with the virtual cluster\r\n')
terminal.write('\r\n')
terminal.write('Quick start:\r\n')
terminal.write('  help              - Show all available commands\r\n')
terminal.write('  kubectl get pods  - List pods in the cluster\r\n')
terminal.write('  debug images      - List available container images\r\n')
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
