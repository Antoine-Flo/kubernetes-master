import { createFileSystem } from '../../filesystem/FileSystem'
import { parseShellCommand } from './parser'
import type { ParsedShellCommand } from './types'
import type { ExecutionResult } from '../../shared/result'
import { error, success } from '../../shared/result'
import { createImageRegistry } from '../../containers/registry/ImageRegistry'
import type { Logger } from '../../logger/Logger'

// ═══════════════════════════════════════════════════════════════════════════
// SHELL COMMAND EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════
// Routes shell commands to filesystem operations with error handling.
// Supports navigation (cd, pwd), listing (ls), file ops (touch, cat, rm), etc.
// Integrates application logger for command tracking.

export type FileSystem = ReturnType<typeof createFileSystem>

export interface ShellExecutor {
    execute: (input: string) => ExecutionResult
}

// Handler signature: only args and flags (dependencies captured in closure)
type CommandHandler = (args: string[], flags: Record<string, boolean | string>) => ExecutionResult

/**
 * Create command handlers Map with dependencies captured in closures
 * Uses currying to pre-apply logger and fileSystem
 * Guarantees uniqueness (Map keys are unique)
 */
const createHandlers = (fileSystem: FileSystem, logger: Logger): Map<string, CommandHandler> => {
    // Currying helper: pre-applies logger and fileSystem
    const withDeps = <TArgs extends any[]>(
        handler: (logger: Logger, fs: FileSystem, ...args: TArgs) => ExecutionResult
    ) => (...args: TArgs) => handler(logger, fileSystem, ...args)

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
 * Factory function that encapsulates FileSystem and Logger in closures
 * 
 * @param fileSystem - The file system to operate on
 * @param logger - Application logger for tracking commands
 * @returns Executor with execute method
 */
export const createShellExecutor = (fileSystem: FileSystem, logger: Logger): ShellExecutor => {
    const handlers = createHandlers(fileSystem, logger)

    const execute = (input: string): ExecutionResult => {
        logger.info('COMMAND', `Shell: ${input}`)

        const parseResult = parseShellCommand(input)
        if (parseResult.type === 'error') {
            // Enrich error message with full input for "Unknown command" errors
            const errorMessage = parseResult.message.startsWith('Unknown command')
                ? `Unknown command: ${input}`
                : parseResult.message
            logger.error('EXECUTOR', `Parse error: ${errorMessage}`)
            return error(errorMessage)
        }

        logger.debug('EXECUTOR', `Routing to handler: ${parseResult.data.command}`)
        return routeCommand(handlers, parseResult.data, logger)
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
        if (result.type === 'error') {
            logger.error('FILESYSTEM', `cd failed: ${result.message}`)
            return error(result.message)
        }
        return success('')
    }

    const path = args[0]
    logger.debug('FILESYSTEM', `Changing directory to: ${path}`)
    const result = fileSystem.changeDirectory(path)

    if (result.type === 'error') {
        logger.error('FILESYSTEM', `cd failed: ${result.message}`)
        return error(result.message)
    }

    return success('')
}

const handleLs = (logger: Logger, fileSystem: FileSystem, args: string[], flags: Record<string, boolean | string>): ExecutionResult => {
    // Determine target path (first arg or flag value, or current directory)
    const targetPath = typeof flags.l === 'string' ? flags.l : args[0]
    logger.debug('FILESYSTEM', `Listing directory: ${targetPath || 'current'}`)

    const result = fileSystem.listDirectory(targetPath)

    if (result.type === 'error') {
        logger.error('FILESYSTEM', `ls failed: ${result.message}`)
        return error(result.message)
    }

    const nodes = result.data

    // Simple listing (just names)
    if (!flags.l) {
        const names = nodes.map((node) => node.name).join('  ')
        return success(names)
    }

    // Detailed listing (-l flag)
    const lines = nodes.map((node) => {
        const type = node.type === 'directory' ? 'd' : '-'
        const name = node.name
        if (node.type === 'directory') {
            return `${type}  ${name}/`
        }
        return `${type}  ${name}`
    })

    return success(lines.join('\n'))
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

    if (result.type === 'error') {
        logger.error('FILESYSTEM', `mkdir failed: ${result.message}`)
        return error(result.message)
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

    if (result.type === 'error') {
        logger.error('FILESYSTEM', `touch failed: ${result.message}`)
        return error(result.message)
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

    if (result.type === 'error') {
        logger.error('FILESYSTEM', `cat failed: ${result.message}`)
        return error(result.message)
    }

    return success(result.data)
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
        if (result.type === 'error') {
            logger.error('FILESYSTEM', `rm failed: ${result.message}`)
            return error(result.message)
        }
        return success('')
    }

    // Otherwise delete file
    logger.debug('FILESYSTEM', `Removing file: ${target}`)
    const result = fileSystem.deleteFile(target)
    if (result.type === 'error') {
        logger.error('FILESYSTEM', `rm failed: ${result.message}`)
        return error(result.message)
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
  rm <file>       Remove file
  rm -r <dir>     Remove directory
  clear           Clear terminal
  help            Show this help
  debug images    List available container images

Use 'kubectl' prefix for Kubernetes commands`

    return success(helpText)
}

const handleDebug = (logger: Logger, _fileSystem: FileSystem, args: string[]): ExecutionResult => {
    const subcommand = args[0]

    if (!subcommand) {
        const usageText = `Debug commands:
  debug images    List all available container images
  debug logs      Show application logs (last 50 entries)
  debug clear     Clear application logs

Usage: debug <subcommand>`

        return success(usageText)
    }

    // Handle 'images' subcommand
    if (subcommand === 'images') {
        // Instantiate registry locally - no need to pass as dependency
        const imageRegistry = createImageRegistry()
        const images = imageRegistry.listAllImages()

        const lines = ['=== Available Container Images ===', '']

        images.forEach((img) => {
            lines.push(`${img.registry}/${img.name}`)
            lines.push(`  Tags: ${img.tags.join(', ')}`)
            if (img.defaultPorts.length > 0) {
                lines.push(`  Ports: ${img.defaultPorts.join(', ')}`)
            }
            lines.push(`  Status: ${img.behavior.defaultStatus}`)
            lines.push('')
        })

        lines.push('Use these images in your pod manifests.')

        return success(lines.join('\n'))
    }

    // Handle 'logs' subcommand
    if (subcommand === 'logs') {
        const entries = logger.getEntries()

        if (entries.length === 0) {
            return success('No application logs available.')
        }

        // Show last 50 entries
        const displayEntries = entries.slice(-50)
        const lines = ['=== Application Logs (last 50 entries) ===', '']

        displayEntries.forEach((entry) => {
            const timestamp = new Date(entry.timestamp).toLocaleTimeString()
            const level = entry.level.toUpperCase().padEnd(5)
            const category = entry.category.padEnd(10)
            lines.push(`[${timestamp}] [${level}] [${category}] ${entry.message}`)
        })

        return success(lines.join('\n'))
    }

    // Handle 'clear' subcommand
    if (subcommand === 'clear') {
        logger.clear()
        return success('Application logs cleared.')
    }

    // Unknown subcommand
    return error(`Unknown debug subcommand: ${subcommand}`)
}

