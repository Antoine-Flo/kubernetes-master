import './style.css'
import { createTerminalManager } from './terminal/TerminalManager'
import { createSeedCluster } from './cluster/seedCluster'
import { createKubectlExecutor } from './kubectl/commands/executor'
import { createLogger } from './logger/Logger'

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

// Create logger
const logger = createLogger({ mirrorToConsole: true })

// Create kubectl executor
const kubectlExecutor = createKubectlExecutor(clusterState, logger)

// Initialize terminal
const terminal = createTerminalManager(terminalContainer)

// Welcome message
terminal.write('Welcome to Kube Simulator\r\n')
terminal.write('Type kubectl commands to interact with the virtual cluster\r\n')
terminal.write('\r\n')

// Show prompt and focus terminal
terminal.showPrompt()
terminal.focus()

// Handle commands
terminal.onCommand((command) => {
    const trimmed = command.trim()

    // Handle empty commands
    if (!trimmed) {
        return
    }

    // Check if command starts with kubectl
    if (!trimmed.startsWith('kubectl')) {
        terminal.write(`Error: Command must start with 'kubectl'\r\n`)
        return
    }

    // Execute kubectl command
    const result = kubectlExecutor.execute(trimmed)

    // Display result (stdout/stderr)
    if (result.type === 'success') {
        // Format output with proper line endings
        const formattedOutput = result.data.split('\n').join('\r\n')
        terminal.write(`${formattedOutput}\r\n`)
    } else {
        terminal.write(`Error: ${result.message}\r\n`)
    }
})
