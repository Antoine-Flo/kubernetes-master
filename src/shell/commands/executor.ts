import type { EditorModal } from '../../editor/EditorModal'
import { createFileSystem } from '../../filesystem/FileSystem'
import type { Logger } from '../../logger/Logger'
import { formatColumns, formatLongListing, formatTable, type FileEntry } from '../../shared/formatter'
import type { ExecutionResult } from '../../shared/result'
import { error, success } from '../../shared/result'
import { handleNano } from './handlers/nano'
import { parseShellCommand } from './parser'
import type { ParsedShellCommand } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// SHELL COMMAND EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════
// Routes shell commands to filesystem operations with error handling.
// Supports navigation (cd, pwd), listing (ls), file ops (touch, cat, rm), etc.
// Integrates application logger for command tracking.

export type FileSystem = ReturnType<typeof createFileSystem>

// Handler signature: only args and flags (dependencies captured in closure)
type CommandHandler = (args: string[], flags: Record<string, boolean | string>) => ExecutionResult

/**
 * Create command handlers Map with dependencies captured in closures
 * Uses currying to pre-apply logger, fileSystem, and editorModal
 * Guarantees uniqueness (Map keys are unique)
 */
const createHandlers = (fileSystem: FileSystem, logger: Logger, editorModal?: EditorModal): Map<string, CommandHandler> => {
    // Currying helper: pre-applies logger and fileSystem
    const withDeps = <TArgs extends any[]>(
        handler: (logger: Logger, fs: FileSystem, ...args: TArgs) => ExecutionResult
    ) => (...args: TArgs) => handler(logger, fileSystem, ...args)

    // Currying helper for nano: pre-applies logger, fileSystem, and editorModal
    const withEditorDeps = <TArgs extends any[]>(
        handler: (logger: Logger, fs: FileSystem, modal: EditorModal, ...args: TArgs) => ExecutionResult
    ) => (...args: TArgs) => {
        if (!editorModal) {
            return error('Editor not available')
        }
        return handler(logger, fileSystem, editorModal, ...args)
    }

    const handlers = new Map<string, CommandHandler>()

    // Ultra-concis: une ligne par handler, dépendances auto-injectées
    handlers.set('pwd', withDeps(handlePwd))
    handlers.set('clear', withDeps(handleClear))
    handlers.set('help', withDeps(handleHelp))
    handlers.set('cd', withDeps(handleCd))
    handlers.set('ls', withDeps(handleLs))
    handlers.set('mkdir', withDeps(handleMkdir))
    handlers.set('touch', withDeps(handleTouch))
    handlers.set('cat', withDeps(handleCat))
    handlers.set('rm', withDeps(handleRm))
    handlers.set('debug', withDeps(handleDebug))
    handlers.set('nano', withEditorDeps(handleNano))
    handlers.set('vi', withEditorDeps(handleNano))    // Alias for nano
    handlers.set('vim', withEditorDeps(handleNano))   // Alias for nano

    return handlers
}

/**
 * Route command to handler from Map
 */
const routeCommand = (
    handlers: Map<string, CommandHandler>,
    parsed: ParsedShellCommand,
    logger: Logger
): ExecutionResult => {
    const { command, args, flags } = parsed
    const handler = handlers.get(command)

    if (!handler) {
        // This should never happen since parser validates commands
        logger.error('EXECUTOR', `Handler not found for command: ${command}`)
        return error(`Handler not found for command: ${command}`)
    }

    return handler(args, flags)
}

/**
 * Create a shell executor
 * Factory function that encapsulates FileSystem, Logger, and EditorModal in closures
 * 
 * @param fileSystem - The file system to operate on
 * @param logger - Application logger for tracking commands
 * @param editorModal - Optional editor modal for nano command
 * @returns Executor with execute method
 */
export const createShellExecutor = (fileSystem: FileSystem, logger: Logger, editorModal?: EditorModal) => {
    const handlers = createHandlers(fileSystem, logger, editorModal)

    const execute = (input: string): ExecutionResult => {
        logger.info('COMMAND', `Shell: ${input}`)

        const parseResult = parseShellCommand(input)
        if (!parseResult.ok) {
            // Enrich error message with full input for "Unknown command" errors
            const errorMessage = parseResult.error.startsWith('Unknown command')
                ? `Unknown command: ${input}`
                : parseResult.error
            logger.error('EXECUTOR', `Parse error: ${errorMessage}`)
            return error(errorMessage)
        }

        logger.debug('EXECUTOR', `Routing to handler: ${parseResult.value.command}`)
        return routeCommand(handlers, parseResult.value, logger)
    }

    return { execute }
}

const handlePwd = (logger: Logger, fileSystem: FileSystem): ExecutionResult => {
    const currentPath = fileSystem.getCurrentPath()
    logger.debug('FILESYSTEM', `Current path: ${currentPath}`)
    return success(currentPath)
}

const handleClear = (logger: Logger): ExecutionResult => {
    logger.debug('COMMAND', 'Terminal cleared')
    // Return empty output - terminal will handle clearing
    return success('')
}

const handleCd = (logger: Logger, fileSystem: FileSystem, args: string[]): ExecutionResult => {
    if (args.length === 0) {
        // cd without args goes to root
        logger.debug('FILESYSTEM', 'Changing to root directory')
        const result = fileSystem.changeDirectory('/')
        if (!result.ok) {
            logger.error('FILESYSTEM', `cd failed: ${result.error}`)
            return error(result.error)
        }
        return success('')
    }

    const path = args[0]
    logger.debug('FILESYSTEM', `Changing directory to: ${path}`)
    const result = fileSystem.changeDirectory(path)

    if (!result.ok) {
        logger.error('FILESYSTEM', `cd failed: ${result.error}`)
        return error(result.error)
    }

    return success('')
}

const handleLs = (logger: Logger, fileSystem: FileSystem, args: string[], flags: Record<string, boolean | string>): ExecutionResult => {
    // Determine target path (first arg or flag value, or current directory)
    const targetPath = typeof flags.l === 'string' ? flags.l : args[0]
    logger.debug('FILESYSTEM', `Listing directory: ${targetPath || 'current'}`)

    const result = fileSystem.listDirectory(targetPath)

    if (!result.ok) {
        logger.error('FILESYSTEM', `ls failed: ${result.error}`)
        return error(result.error)
    }

    const nodes = result.value

    // Simple listing (just names) - use formatColumns
    if (!flags.l) {
        const names = nodes.map((node) => node.name)
        return success(formatColumns(names))
    }

    // Detailed listing (-l flag) - use formatLongListing
    const now = new Date().toISOString()
    const entries: FileEntry[] = nodes.map((node) => ({
        type: node.type,
        name: node.name,
        size: node.type === 'file' ? (node.content?.length || 0) : 512,
        modified: node.type === 'file' ? node.modifiedAt : now
    }))

    return success(formatLongListing(entries))
}

const handleMkdir = (logger: Logger, fileSystem: FileSystem, args: string[], flags: Record<string, boolean | string>): ExecutionResult => {
    // -p flag: value is the path
    const dirName = typeof flags.p === 'string' ? flags.p : args[0]

    if (!dirName) {
        logger.error('FILESYSTEM', 'mkdir: missing operand')
        return error('mkdir: missing operand')
    }

    logger.debug('FILESYSTEM', `Creating directory: ${dirName}`)
    // Note: -p recursive creation will be handled in future sprint
    const result = fileSystem.createDirectory(dirName)

    if (!result.ok) {
        logger.error('FILESYSTEM', `mkdir failed: ${result.error}`)
        return error(result.error)
    }

    return success('')
}

const handleTouch = (logger: Logger, fileSystem: FileSystem, args: string[]): ExecutionResult => {
    if (args.length === 0) {
        logger.error('FILESYSTEM', 'touch: missing file operand')
        return error('touch: missing file operand')
    }

    const fileName = args[0]
    logger.debug('FILESYSTEM', `Creating file: ${fileName}`)
    const result = fileSystem.createFile(fileName)

    if (!result.ok) {
        logger.error('FILESYSTEM', `touch failed: ${result.error}`)
        return error(result.error)
    }

    return success('')
}

const handleCat = (logger: Logger, fileSystem: FileSystem, args: string[]): ExecutionResult => {
    if (args.length === 0) {
        logger.error('FILESYSTEM', 'cat: missing file operand')
        return error('cat: missing file operand')
    }

    const filePath = args[0]
    logger.debug('FILESYSTEM', `Reading file: ${filePath}`)
    const result = fileSystem.readFile(filePath)

    if (!result.ok) {
        logger.error('FILESYSTEM', `cat failed: ${result.error}`)
        return error(result.error)
    }

    return success(result.value)
}

const handleRm = (logger: Logger, fileSystem: FileSystem, args: string[], flags: Record<string, boolean | string>): ExecutionResult => {
    // -r flag: value is the directory path
    const target = typeof flags.r === 'string' ? flags.r : args[0]

    if (!target) {
        logger.error('FILESYSTEM', 'rm: missing operand')
        return error('rm: missing operand')
    }

    // If -r flag is present (boolean or string), delete directory
    if (flags.r) {
        logger.debug('FILESYSTEM', `Removing directory: ${target}`)
        const result = fileSystem.deleteDirectory(target)
        if (!result.ok) {
            logger.error('FILESYSTEM', `rm failed: ${result.error}`)
            return error(result.error)
        }
        return success('')
    }

    // Otherwise delete file
    logger.debug('FILESYSTEM', `Removing file: ${target}`)
    const result = fileSystem.deleteFile(target)
    if (!result.ok) {
        logger.error('FILESYSTEM', `rm failed: ${result.error}`)
        return error(result.error)
    }

    return success('')
}

const handleHelp = (_logger: Logger): ExecutionResult => {
    const helpText = `Available shell commands:
  cd <path>       Change directory
  ls [path]       List directory contents
  ls -l [path]    List with details
  pwd             Print working directory
  mkdir <name>    Create directory
  touch <file>    Create empty file
  cat <file>      Display file contents
  nano <file>     Edit file with YAML editor
  vi <file>       Edit file with YAML editor (alias)
  vim <file>      Edit file with YAML editor (alias)
  rm <file>       Remove file
  rm -r <dir>     Remove directory
  clear           Clear terminal
  help            Show this help

Use 'kubectl' prefix for Kubernetes commands
See available images in the Registry panel below`

    return success(helpText)
}

const handleDebug = (logger: Logger, _fileSystem: FileSystem, args: string[]): ExecutionResult => {
    const subcommand = args[0]

    if (!subcommand) {
        const usageText = `Debug commands:
  debug logs      Show application logs (last 50 entries)
  debug clear     Clear application logs

Usage: debug <subcommand>`

        return success(usageText)
    }

    // Handle 'logs' subcommand
    if (subcommand === 'logs') {
        const entries = logger.getEntries()

        if (entries.length === 0) {
            return success('No application logs available.')
        }

        // Show last 50 entries - use formatTable for clean output
        const displayEntries = entries.slice(-50)

        const headers = ['timestamp', 'level', 'category', 'message']
        const rows = displayEntries.map((entry) => [
            new Date(entry.timestamp).toLocaleTimeString(),
            entry.level.toUpperCase(),
            entry.category,
            entry.message
        ])

        const table = formatTable(headers, rows)
        return success(`=== Application Logs (last 50 entries) ===\n\n${table}`)
    }

    // Handle 'clear' subcommand
    if (subcommand === 'clear') {
        logger.clear()
        return success('Application logs cleared.')
    }

    // Unknown subcommand
    return error(`Unknown debug subcommand: ${subcommand}`)
}

