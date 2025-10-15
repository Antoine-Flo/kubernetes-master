// ═══════════════════════════════════════════════════════════════════════════
// SHARED PARSING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
// Common parsing helpers for both kubectl and shell parsers.
// Philosophy: Like Unix getopt() - shared utilities, program-specific logic.

// ─── Types ───────────────────────────────────────────────────────────────

export type ParsedFlags = Record<string, string | boolean>

// ─── Pipeline Step Helpers ──────────────────────────────────────────────
// Generic helpers for parser pipeline steps

/**
 * Trim step for pipeline: trims ctx.input, returns error if empty
 * Works with any context that has an input field
 */
export const trim = <Ctx extends { input: string }>(ctx: Ctx): Result<Ctx> => {
    const trimmed = ctx.input.trim()
    if (!trimmed) {
        return { type: 'error', message: 'Command cannot be empty' }
    }
    return { type: 'success', data: { ...ctx, input: trimmed } }
}

/**
 * Tokenize step for pipeline: splits ctx.input into tokens, returns error if empty
 * Works with any context that has input field, adds tokens field
 */
export const tokenize = <Ctx extends { input: string }>(
    ctx: Ctx
): Result<Ctx & { tokens: string[] }> => {
    const tokens = ctx.input.trim().split(/\s+/).filter((t) => t.length > 0)
    if (tokens.length === 0) {
        return { type: 'error', message: 'Command cannot be empty' }
    }
    return { type: 'success', data: { ...ctx, tokens } }
}

/**
 * Parse flags for pipeline
 */
export const parseFlags = <Ctx extends { tokens?: string[] }>(
    startIndex = 1,
    aliases?: Record<string, string>
) => (ctx: Ctx): Result<Ctx & { flags: ParsedFlags; normalizedFlags?: ParsedFlags }> => {
    if (!ctx.tokens) {
        return { type: 'error', message: 'No tokens available' }
    }

    const rawFlags = parseFlagsRaw(ctx.tokens, startIndex)

    if (aliases) {
        const normalized = normalizeFlags(rawFlags, aliases)
        return { type: 'success', data: { ...ctx, flags: rawFlags, normalizedFlags: normalized } }
    }

    return { type: 'success', data: { ...ctx, flags: rawFlags } }
}

// ─── Flag Parsing (low-level helpers) ────────────────────────────────────

/**
 * Parse flags from tokens array (raw, no normalization)
 * Flags start with - or --
 * Supports both value flags (-n default) and boolean flags (-A)
 * 
 * @param tokens - Array of tokens to parse
 * @param startIndex - Index to start parsing from (default: 0)
 * @returns Object with flags (key-value pairs)
 * 
 * @example
 * parseFlagsRaw(["-n", "default", "--output", "yaml", "-A"])
 * // => { n: "default", output: "yaml", A: true }
 */
export const parseFlagsRaw = (tokens: string[], startIndex = 0): ParsedFlags => {
    const flags: ParsedFlags = {}

    for (let i = startIndex; i < tokens.length; i++) {
        const token = tokens[i]

        // Check if token is a flag
        if (token.startsWith('-')) {
            const flagName = token.replace(/^-+/, '') // Remove leading dashes
            const nextToken = tokens[i + 1]

            // If there's a next token and it's not a flag, it's the value
            if (nextToken && !nextToken.startsWith('-')) {
                flags[flagName] = nextToken
                i++ // Skip the value token
            } else {
                // Boolean flag (no value)
                flags[flagName] = true
            }
        }
    }

    return flags
}

/**
 * Normalize flag names from short aliases to long names
 * Pure function
 * 
 * @param flags - Flags object to normalize
 * @param aliases - Mapping of short names to long names
 * @returns New flags object with normalized names
 * 
 * @example
 * normalizeFlags({ n: "default", o: "yaml" }, { n: "namespace", o: "output" })
 * // => { namespace: "default", output: "yaml" }
 */
export const normalizeFlags = (
    flags: ParsedFlags,
    aliases: Record<string, string>
): ParsedFlags => {
    const normalized: ParsedFlags = {}

    for (const [key, value] of Object.entries(flags)) {
        const longKey = aliases[key] || key
        normalized[longKey] = value
    }

    return normalized
}

// ─── Kubernetes Selector Parsing ─────────────────────────────────────────

/**
 * Parse Kubernetes label selector string into key-value pairs
 * Pure function
 * 
 * @param selector - Selector string (e.g., "app=nginx,env=prod")
 * @returns Object with label key-value pairs
 * 
 * @example
 * parseSelector("app=nginx,env=prod,tier=backend")
 * // => { app: "nginx", env: "prod", tier: "backend" }
 */
export const parseSelector = (selector: string): Record<string, string> => {
    return selector.split(',').reduce((acc, pair) => {
        const [key, value] = pair.split('=')
        if (key && value) {
            acc[key.trim()] = value.trim()
        }
        return acc
    }, {} as Record<string, string>)
}

// ─── Function Composition ────────────────────────────────────────────────

/**
 * Compose functions that return Result types (Railway-oriented programming)
 * Stops at first error, otherwise continues the pipeline
 * Pure function
 * 
 * @example
 * const parseCommand = pipeResult(
 *   validateInput,
 *   extractAction,
 *   validateAction,
 *   buildCommand
 * )
 * 
 * const result = parseCommand(input)
 * // If any step returns error, pipeline stops and returns that error
 * // Otherwise, continues to the end
 */
export const pipeResult = <T, E = string>(
    ...fns: Array<(arg: T) => Result<T, E>>
) => (input: T): Result<T, E> => {
    let current: Result<T, E> = { type: 'success', data: input }

    for (const fn of fns) {
        if (current.type === 'error') {
            return current
        }
        current = fn(current.data)
    }

    return current
}

// Type alias for Result (to avoid circular dependency)
type Result<T, E = string> =
    | { type: 'success'; data: T }
    | { type: 'error'; message: E }

// ─── Validation Helpers ──────────────────────────────────────────────────

/**
 * Extract and validate a token from tokens array
 * Generic helper for extracting commands, actions, resources, etc.
 * 
 * @param tokenIndex - Index of the token to extract
 * @param validValues - Array of valid values for this token
 * @param fieldName - Name of the field to set in context
 * @param errorMsg - Error message if token invalid or missing
 */
export const extract = <Ctx extends { tokens?: string[] }, K extends string>(
    tokenIndex: number,
    validValues: readonly string[],
    fieldName: K,
    errorPrefix: string
) => (ctx: Ctx): Result<Ctx & Record<K, string>> => {
    if (!ctx.tokens || ctx.tokens.length <= tokenIndex) {
        return { type: 'error', message: errorPrefix }
    }

    const token = ctx.tokens[tokenIndex]

    if (!validValues.includes(token)) {
        return { type: 'error', message: `${errorPrefix}: ${token}` }
    }

    return { type: 'success', data: { ...ctx, [fieldName]: token } as Ctx & Record<K, string> }
}

/**
 * Check flags for pipeline
 * Validates that flags requiring values have them
 * 
 * @param flagsRequiringValues - Array of flag names that must have values
 */
export const checkFlags = <Ctx extends { flags?: ParsedFlags }>(
    flagsRequiringValues: string[] = []
) => (ctx: Ctx): Result<Ctx> => {
    if (!ctx.flags) {
        return { type: 'success', data: ctx }
    }

    for (const flagName of flagsRequiringValues) {
        if (flagName in ctx.flags && ctx.flags[flagName] === true) {
            return { type: 'error', message: `flag -${flagName} requires a value` }
        }
    }

    return { type: 'success', data: ctx }
}

/**
 * Extract args for pipeline
 */
export const extractArgs = <Ctx extends { tokens?: string[] }>(
    startIndex = 1
) => (ctx: Ctx): Result<Ctx & { args: string[] }> => {
    if (!ctx.tokens) {
        return { type: 'error', message: 'No tokens available' }
    }

    const args = extractArgsRaw(ctx.tokens, startIndex)
    return { type: 'success', data: { ...ctx, args } }
}

/**
 * Extract non-flag arguments from tokens (raw helper)
 * Pure function
 * 
 * @param tokens - Array of tokens
 * @param startIndex - Index to start from
 * @returns Array of arguments (non-flags)
 * 
 * @example
 * extractArgsRaw(["get", "pods", "nginx", "-n", "default"], 0)
 * // => ["get", "pods", "nginx"]
 */
export const extractArgsRaw = (tokens: string[], startIndex = 0): string[] => {
    const args: string[] = []

    for (let i = startIndex; i < tokens.length; i++) {
        const token = tokens[i]

        if (token.startsWith('-')) {
            // Skip flag and its potential value
            const nextToken = tokens[i + 1]
            if (nextToken && !nextToken.startsWith('-')) {
                i++ // Skip value
            }
        } else {
            args.push(token)
        }
    }

    return args
}

