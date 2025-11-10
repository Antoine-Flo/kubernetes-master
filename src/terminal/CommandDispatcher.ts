import { getContainerFileSystem } from '../cluster/ressources/Pod'
import type { EditorModal } from '../editor/EditorModal'
import type { FileSystemState } from '../filesystem/FileSystem'
import { createKubectlExecutor } from '../kubectl/commands/executor'
import type { Logger } from '../logger/Logger'
import type { ExecutionResult } from '../shared/result'
import { createShellExecutor } from '../shell/commands/executor'
import type { TerminalManager } from './TerminalManager'

interface CommandDispatcher {
    execute: (command: string) => void
    enterContainer: (podName: string, containerName: string, namespace: string, containerFileSystem: FileSystemState) => void
    exitContainer: () => boolean
    getCurrentFileSystem: () => any
    updatePrompt: () => void
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const writeOutput = (terminal: TerminalManager, output: string): void => {
    const formatted = output.split('\n').join('\r\n')
    terminal.write(`${formatted}\r\n`)
}

const handleExit = (terminal: TerminalManager): void => {
    const exited = terminal.exitContainer()
    const message = exited ? 'Exited container' : 'Already in host shell'
    terminal.write(`${message}\r\n`)
    terminal.updatePrompt()
}

const handleEnterContainer = (terminal: TerminalManager, clusterState: any, result: ExecutionResult): boolean => {
    if (!result.ok || !result.value?.startsWith('ENTER_CONTAINER:')) {
        return false
    }

    const [, podName, containerName, namespace] = result.value.split(':')
    const pod = clusterState.getPods().find((p: any) =>
        p.metadata.name === podName && p.metadata.namespace === namespace
    )

    if (!pod) {
        terminal.write(`Error: Could not find pod ${podName}\r\n`)
        terminal.updatePrompt()
        return true
    }

    const containerFS = getContainerFileSystem(pod, containerName)
    if (!containerFS) {
        terminal.write(`Error: Could not access container ${containerName}\r\n`)
        terminal.updatePrompt()
        return true
    }

    terminal.enterContainer(podName, containerName, namespace, containerFS)
    terminal.write(`Entering container ${containerName} in pod ${podName}...\r\n`)
    terminal.updatePrompt()
    return true
}

const handleShellInContainer = (terminal: TerminalManager, result: ExecutionResult, fileSystem: any, logger: Logger, editorModal: EditorModal): boolean => {
    if (!result.ok || !result.value?.startsWith('SHELL_COMMAND:')) {
        return false
    }

    const command = result.value.substring('SHELL_COMMAND:'.length)
    const shellExecutor = createShellExecutor(fileSystem, logger, editorModal)
    const shellResult = shellExecutor.execute(command)

    if (shellResult.ok && shellResult.value) {
        writeOutput(terminal, shellResult.value)
    } else if (!shellResult.ok) {
        terminal.write(`Error: ${shellResult.error}\r\n`)
    }

    terminal.updatePrompt()
    return true
}

const displayResult = (terminal: TerminalManager, result: ExecutionResult): void => {
    if (result.ok && result.value) {
        writeOutput(terminal, result.value)
    } else if (!result.ok) {
        terminal.write(`Error: ${result.error}\r\n`)
    }
    terminal.updatePrompt()
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND DISPATCHER FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export const createCommandDispatcher = (
    terminal: TerminalManager,
    clusterState: any,
    fileSystem: any,
    logger: Logger,
    editorModal: EditorModal,
    eventBus: any
): CommandDispatcher => {
    const kubectlExecutor = createKubectlExecutor(clusterState, fileSystem, logger, eventBus)

    const execute = (command: string): void => {
        const trimmed = command.trim()

        if (!trimmed) {
            return
        }

        if (trimmed === 'exit') {
            handleExit(terminal)
            return
        }

        const currentFS = terminal.getCurrentFileSystem()

        // Execute command with current filesystem context
        const result = trimmed.startsWith('kubectl')
            ? kubectlExecutor.execute(trimmed, currentFS)
            : createShellExecutor(currentFS, logger, editorModal).execute(trimmed)

        // Handle special kubectl responses
        if (trimmed.startsWith('kubectl')) {
            if (handleEnterContainer(terminal, clusterState, result)) {
                return
            }
            if (handleShellInContainer(terminal, result, currentFS, logger, editorModal)) {
                return
            }
        }

        // Display normal result
        displayResult(terminal, result)
    }

    return {
        execute,
        enterContainer: (podName: string, containerName: string, namespace: string, containerFS: FileSystemState) => {
            terminal.enterContainer(podName, containerName, namespace, containerFS)
            terminal.write(`Entering container ${containerName} in pod ${podName}...\r\n`)
            terminal.updatePrompt()
        },
        exitContainer: () => terminal.exitContainer(),
        getCurrentFileSystem: () => terminal.getCurrentFileSystem(),
        updatePrompt: () => terminal.updatePrompt()
    }
}
