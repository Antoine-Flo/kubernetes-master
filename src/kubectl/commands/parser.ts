import type { Action, Resource, ParsedCommand } from './types'
import type { Result } from '../../shared/result'
import { success, error } from '../../shared/result'
import {
    trim,
    tokenize,
    extract,
    parseFlags,
    checkFlags,
    parseSelector,
    pipeResult
} from '../../shared/parsing'

// ═══════════════════════════════════════════════════════════════════════════
// KUBECTL COMMAND PARSER
// ═══════════════════════════════════════════════════════════════════════════
// Parses kubectl command strings with resource aliases and namespace flags.
// Supports all kubectl actions (get, describe, delete, apply, create).
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
    action?: Action
    resource?: Resource
    name?: string
    flags?: Record<string, string | boolean>
    normalizedFlags?: Record<string, string | boolean>
}

// ─── Constants ───────────────────────────────────────────────────────────

const VALID_ACTIONS: Action[] = ['get', 'describe', 'delete', 'apply', 'create']

// Flag aliases: short form → long form
const FLAG_ALIASES: Record<string, string> = {
    'n': 'namespace',
    'o': 'output',
    'l': 'selector',
    'f': 'filename',
    'A': 'all-namespaces',
}

// Flags that require a value (cannot be boolean)
const FLAGS_REQUIRING_VALUES = ['n', 'namespace', 'o', 'output', 'f', 'filename', 'l', 'selector']

// Output formats for kubectl commands
type OutputFormat = 'table' | 'yaml' | 'json'
const VALID_OUTPUT_FORMATS: OutputFormat[] = ['table', 'yaml', 'json']

// Kubectl resources: canonical name -> list of aliases
const KUBECTL_RESOURCES = {
    pods: ['pods', 'pod', 'po'],
    deployments: ['deployments', 'deployment', 'deploy'],
    services: ['services', 'service', 'svc'],
    namespaces: ['namespaces', 'namespace', 'ns'],
} as const

// Build reverse lookup: alias -> canonical resource (O(1) access)
const RESOURCE_ALIAS_MAP = buildResourceAliasMap()

function buildResourceAliasMap(): Record<string, string> {
    const map: Record<string, string> = {}

    for (const [canonical, aliases] of Object.entries(KUBECTL_RESOURCES)) {
        for (const alias of aliases) {
            map[alias] = canonical
        }
    }

    return map
}

/**
 * Main entry point for parsing kubectl commands
 * Pure function using Railway-oriented programming (pipeResult)
 * 
 * Pipeline: validate input → tokenize → validate kubectl → extract action →
 *           parse flags → extract resource → validate → build command
 */
export const parseCommand = (input: string): Result<ParsedCommand> => {
    // Create the parsing pipeline
    const pipeline = pipeResult<ParseContext>(
        trim,
        tokenize,
        checkKubectl,
        extract(1, VALID_ACTIONS, 'action', 'Invalid or missing action'),
        parseFlags(1, FLAG_ALIASES),
        checkFlags(FLAGS_REQUIRING_VALUES),
        handleApplyCreate,
        extractResource,
        extractName,
        checkSemantics,
        build
    )

    // Execute pipeline
    const result = pipeline({ input })

    // Transform ParseContext result to ParsedCommand result
    if (result.type === 'error') {
        return result
    }

    // Extract the command from the final context
    const ctx = result.data
    if (!ctx.action || !ctx.resource || !ctx.flags) {
        return error('Internal parsing error: incomplete context')
    }

    const normalizedFlags = ctx.normalizedFlags || ctx.flags

    return success({
        action: ctx.action,
        resource: ctx.resource,
        name: ctx.name,
        namespace: getNamespaceFromFlags(normalizedFlags),
        output: getOutputFromFlags(normalizedFlags),
        selector: getSelectorFromFlags(normalizedFlags),
        flags: ctx.flags,
    })
}

// ─── Pipeline Steps ──────────────────────────────────────────────────────
// Each step: ParseContext → Result<ParseContext>

const checkKubectl = (ctx: ParseContext): Result<ParseContext> => {
    if (!ctx.tokens || ctx.tokens[0] !== 'kubectl') {
        return error('Command must start with kubectl')
    }
    return success(ctx)
}




const handleApplyCreate = (ctx: ParseContext): Result<ParseContext> => {
    if (ctx.action === 'apply' || ctx.action === 'create') {
        // Set default resource for apply/create (will be overridden by file content)
        return success({ ...ctx, resource: 'pods' as Resource })
    }
    return success(ctx)
}

const extractResource = (ctx: ParseContext): Result<ParseContext> => {
    // Skip for apply/create (already handled)
    if (ctx.action === 'apply' || ctx.action === 'create') {
        return success(ctx)
    }

    if (!ctx.tokens || ctx.tokens.length < 3) {
        return error('Invalid or missing resource type')
    }

    const resourceToken = ctx.tokens[2]

    // Skip if it's a flag
    if (resourceToken.startsWith('-')) {
        return error('Invalid or missing resource type')
    }

    // Lookup canonical resource from alias map
    const resource = RESOURCE_ALIAS_MAP[resourceToken] as Resource | undefined

    if (!resource) {
        return error('Invalid or missing resource type')
    }

    return success({ ...ctx, resource })
}

const extractName = (ctx: ParseContext): Result<ParseContext> => {
    if (!ctx.tokens || ctx.tokens.length < 4) {
        return success(ctx) // Name is optional
    }

    const nameToken = ctx.tokens[3]

    // Skip if it's a flag
    if (nameToken.startsWith('-')) {
        return success(ctx)
    }

    return success({ ...ctx, name: nameToken })
}

const checkSemantics = (ctx: ParseContext): Result<ParseContext> => {
    if (!ctx.action || !ctx.resource) {
        return error('Missing action or resource')
    }

    const validationError = validateCommandSemantics(ctx.action, ctx.resource, ctx.name)
    if (validationError) {
        return error(validationError)
    }

    return success(ctx)
}

const build = (ctx: ParseContext): Result<ParseContext> => {
    return success(ctx)
}

// ─── Flag Helpers ────────────────────────────────────────────────────────

/**
 * Get namespace from normalized flags with default fallback
 * Supports both -n and --all-namespaces
 */
const getNamespaceFromFlags = (flags: Record<string, string | boolean>): string | undefined => {
    // --all-namespaces takes precedence
    if (flags['all-namespaces'] === true) {
        return undefined // Signals all namespaces
    }

    // Otherwise use explicit namespace or default
    const ns = flags['namespace']
    return typeof ns === 'string' ? ns : undefined
}

/**
 * Get output format from normalized flags with default fallback
 */
const getOutputFromFlags = (flags: Record<string, string | boolean>): OutputFormat => {
    const output = flags['output']

    if (typeof output === 'string' && VALID_OUTPUT_FORMATS.includes(output as OutputFormat)) {
        return output as OutputFormat
    }

    return 'table' // Default
}

/**
 * Get selector from normalized flags and parse it
 */
const getSelectorFromFlags = (flags: Record<string, string | boolean>): Record<string, string> | undefined => {
    const selector = flags['selector']

    if (typeof selector === 'string') {
        return parseSelector(selector)
    }

    return undefined
}

// ─── Validation ──────────────────────────────────────────────────────────

/**
 * Validate command semantics (fail fast)
 * Returns error message if invalid, undefined if valid
 */
const validateCommandSemantics = (
    action: Action,
    _resource: Resource,
    name?: string
): string | undefined => {
    if ((action === 'delete' || action === 'describe') && !name) {
        return `${action} requires a resource name`
    }
    return undefined
}

