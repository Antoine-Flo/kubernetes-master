import { createFileSystem } from '../../filesystem/FileSystem'
import { parseShellCommand } from './parser'
import type { ParsedShellCommand } from './types'
import type { ExecutionResult } from '../../shared/result'
import { error, success } from '../../shared/result'
import { createImageRegistry } from '../../containers/registry/ImageRegistry'

// ═══════════════════════════════════════════════════════════════════════════
// SHELL COMMAND EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════
// Routes shell commands to filesystem operations with error handling.
// Supports navigation (cd, pwd), listing (ls), file ops (touch, cat, rm), etc.

export type FileSystem = ReturnType<typeof createFileSystem>

export interface ShellExecutor {
    execute: (input: string) => ExecutionResult
}

type CommandHandler = (
    fileSystem: FileSystem,
    args: string[],
    flags: Record<string, boolean | string>
) => ExecutionResult

const COMMAND_HANDLERS: Record<string, CommandHandler> = {
    pwd: (fs) => handlePwd(fs),
    clear: () => handleClear(),
    help: () => handleHelp(),
    cd: (fs, args) => handleCd(fs, args),
    ls: (fs, args, flags) => handleLs(fs, args, flags),
    mkdir: (fs, args, flags) => handleMkdir(fs, args, flags),
    touch: (fs, args) => handleTouch(fs, args),
    cat: (fs, args) => handleCat(fs, args),
    rm: (fs, args, flags) => handleRm(fs, args, flags),
    debug: (_fs, args) => handleDebug(args),
}

/**
 * Create a shell executor
 * Factory function that encapsulates FileSystem in a closure
 * 
 * @param fileSystem - The file system to operate on
 * @returns Executor with execute method
 */
export const createShellExecutor = (fileSystem: FileSystem): ShellExecutor => {
    const execute = (input: string): ExecutionResult => {
        // Parse the command
        const parseResult = parseShellCommand(input)

        // Handle parser errors
        if (parseResult.type === 'error') {
            return error(parseResult.message)
        }

        const parsed = parseResult.data

        // Route to appropriate handler based on command
        return routeCommand(fileSystem, parsed)
    }

    return { execute }
}

const routeCommand = (fileSystem: FileSystem, parsed: ParsedShellCommand): ExecutionResult => {
    const { command, args, flags } = parsed

    const handler = COMMAND_HANDLERS[command]

    if (!handler) {
        return error(`Unknown command: ${command}`)
    }

    return handler(fileSystem, args, flags)
}

const handlePwd = (fileSystem: FileSystem): ExecutionResult => {
    const currentPath = fileSystem.getCurrentPath()
    return success(currentPath)
}

const handleClear = (): ExecutionResult => {
    // Return empty output - terminal will handle clearing
    return success('')
}

const handleCd = (fileSystem: FileSystem, args: string[]): ExecutionResult => {
    if (args.length === 0) {
        // cd without args goes to root
        const result = fileSystem.changeDirectory('/')
        if (result.type === 'error') {
            return error(result.message)
        }
        return success('')
    }

    const path = args[0]
    const result = fileSystem.changeDirectory(path)

    if (result.type === 'error') {
        return error(result.message)
    }

    return success('')
}

const handleLs = (fileSystem: FileSystem, args: string[], flags: Record<string, boolean | string>): ExecutionResult => {
    // Determine target path (first arg or flag value, or current directory)
    const targetPath = typeof flags.l === 'string' ? flags.l : args[0]

    const result = fileSystem.listDirectory(targetPath)

    if (result.type === 'error') {
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

const handleMkdir = (fileSystem: FileSystem, args: string[], flags: Record<string, boolean | string>): ExecutionResult => {
    // -p flag: value is the path
    const dirName = typeof flags.p === 'string' ? flags.p : args[0]

    if (!dirName) {
        return error('mkdir: missing operand')
    }

    // Note: -p recursive creation will be handled in future sprint
    const result = fileSystem.createDirectory(dirName)

    if (result.type === 'error') {
        return error(result.message)
    }

    return success('')
}

const handleTouch = (fileSystem: FileSystem, args: string[]): ExecutionResult => {
    if (args.length === 0) {
        return error('touch: missing file operand')
    }

    const fileName = args[0]
    const result = fileSystem.createFile(fileName)

    if (result.type === 'error') {
        return error(result.message)
    }

    return success('')
}

const handleCat = (fileSystem: FileSystem, args: string[]): ExecutionResult => {
    if (args.length === 0) {
        return error('cat: missing file operand')
    }

    const filePath = args[0]
    const result = fileSystem.readFile(filePath)

    if (result.type === 'error') {
        return error(result.message)
    }

    return success(result.data)
}

const handleRm = (fileSystem: FileSystem, args: string[], flags: Record<string, boolean | string>): ExecutionResult => {
    // -r flag: value is the directory path
    const target = typeof flags.r === 'string' ? flags.r : args[0]

    if (!target) {
        return error('rm: missing operand')
    }

    // If -r flag is present (boolean or string), delete directory
    if (flags.r) {
        const result = fileSystem.deleteDirectory(target)
        if (result.type === 'error') {
            return error(result.message)
        }
        return success('')
    }

    // Otherwise delete file
    const result = fileSystem.deleteFile(target)
    if (result.type === 'error') {
        return error(result.message)
    }

    return success('')
}

const handleHelp = (): ExecutionResult => {
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

const handleDebug = (args: string[]): ExecutionResult => {
    const subcommand = args[0]

    if (!subcommand || subcommand !== 'images') {
        const usageText = `Debug commands:
  debug images    List all available container images

Usage: debug <subcommand>`

        return success(usageText)
    }

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

