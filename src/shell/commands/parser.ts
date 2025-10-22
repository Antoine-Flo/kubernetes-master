import {
    checkFlags,
    extract,
    extractArgs,
    parseFlags,
    pipeResult,
    tokenize,
    trim
} from '../../shared/parsing'
import type { Result } from '../../shared/result'
import { error, success } from '../../shared/result'
import type { ParsedShellCommand, ShellCommand } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// SHELL COMMAND PARSER
// ═══════════════════════════════════════════════════════════════════════════
// Parses shell command strings into structured objects with args and flags.
// Validates commands against allowed list and extracts boolean/value flags.
// 
// Uses Railway-oriented programming (pipeResult) for clean pipeline composition.
// Each step transforms a ParseContext and can fail, stopping the pipeline.

// ─── Types ───────────────────────────────────────────────────────────────

/**
 * Internal parsing context that accumulates state through the pipeline
 */
type ParseContext = {
    input: string
    tokens?: string[]
    command?: ShellCommand
    args?: string[]
    flags?: Record<string, string | boolean>
}

// ─── Constants ───────────────────────────────────────────────────────────

export const VALID_COMMANDS: ShellCommand[] = [
    'cd',
    'ls',
    'pwd',
    'mkdir',
    'touch',
    'cat',
    'rm',
    'clear',
    'help',
    'debug',
    'nano',
    'vi',
    'vim',
]

// Shell flags that require values (for future use)
const FLAGS_REQUIRING_VALUES: string[] = []

/**
 * Parse shell command string into structured object
 * Pure function using Railway-oriented programming (pipeResult)
 * 
 * Pipeline: validate input → tokenize → extract command → 
 *           parse flags → extract args → build result
 * 
 * @param input - Raw command string (e.g., "ls -l", "cd /manifests")
 * @returns Parsed command or error
 */
export const parseShellCommand = (input: string): Result<ParsedShellCommand> => {
    // Create the parsing pipeline
    const pipeline = pipeResult<ParseContext>(
        trim,
        tokenize,
        extract(0, VALID_COMMANDS, 'command', 'Unknown command'),
        parseFlags(1),
        checkFlags(FLAGS_REQUIRING_VALUES),
        extractArgs(1)
    )

    // Execute pipeline
    const result = pipeline({ input })

    // Transform ParseContext result to ParsedShellCommand result
    if (!result.ok) {
        return result
    }

    const ctx = result.value
    if (!ctx.command || !ctx.args || !ctx.flags) {
        return error('Internal parsing error: incomplete context')
    }

    return success({
        command: ctx.command,
        args: ctx.args,
        flags: ctx.flags,
    })
}


