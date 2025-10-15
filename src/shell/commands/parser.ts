import type { ShellCommand, ParsedShellCommand, ShellResult } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// SHELL COMMAND PARSER
// ═══════════════════════════════════════════════════════════════════════════
// Parses shell command strings into structured objects with args and flags.
// Validates commands against allowed list and extracts boolean/value flags.

const VALID_COMMANDS: ShellCommand[] = [
    'cd',
    'ls',
    'pwd',
    'mkdir',
    'touch',
    'cat',
    'rm',
    'clear',
    'help',
]

/**
 * Parse shell command string into structured object
 * @param input - Raw command string (e.g., "ls -l", "cd /manifests")
 * @returns Parsed command or error
 */
export const parseShellCommand = (input: string): ShellResult<ParsedShellCommand> => {
    // Trim and check for empty input
    const trimmed = input.trim()
    if (!trimmed) {
        return { type: 'error', message: 'Command cannot be empty' }
    }

    // Split into tokens, filtering out empty strings
    const tokens = trimmed.split(/\s+/).filter((t) => t.length > 0)

    if (tokens.length === 0) {
        return { type: 'error', message: 'Command cannot be empty' }
    }

    // Extract command (first token)
    const command = extractCommand(tokens)
    if (!command) {
        return { type: 'error', message: `Unknown command: ${tokens[0]}` }
    }

    // Parse flags and args
    const { flags, args } = parseTokens(tokens.slice(1))

    // Build parsed command
    const parsed: ParsedShellCommand = {
        command,
        args,
        flags,
    }

    return { type: 'success', data: parsed }
}

const extractCommand = (tokens: string[]): ShellCommand | undefined => {
    const cmd = tokens[0]
    return VALID_COMMANDS.includes(cmd as ShellCommand) ? (cmd as ShellCommand) : undefined
}

/**
 * Parse flags and arguments from tokens
 * Flags start with - (e.g., -l, -p, -r)
 * Everything else is an argument
 */
const parseTokens = (tokens: string[]): { flags: Record<string, boolean | string>; args: string[] } => {
    const flags: Record<string, boolean | string> = {}
    const args: string[] = []

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]

        // Check if token is a flag
        if (token.startsWith('-')) {
            const flagName = token.replace(/^-+/, '') // Remove leading dashes

            // Check if next token is a value (not a flag)
            const nextToken = tokens[i + 1]
            if (nextToken && !nextToken.startsWith('-')) {
                flags[flagName] = nextToken
                i++ // Skip the value token
            } else {
                // Boolean flag (no value)
                flags[flagName] = true
            }
        } else {
            // Regular argument
            args.push(token)
        }
    }

    return { flags, args }
}

