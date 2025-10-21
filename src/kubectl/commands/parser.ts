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
    execCommand?: string[]
}

// ─── Constants ───────────────────────────────────────────────────────────

const VALID_ACTIONS: Action[] = ['get', 'describe', 'delete', 'apply', 'create', 'logs', 'exec']

// Flag aliases: short form → long form
const FLAG_ALIASES: Record<string, string> = {
    'n': 'namespace',
    'o': 'output',
    'l': 'selector',
    'f': 'filename',  // Note: -f is also used for --follow in logs, but filename takes precedence
    'A': 'all-namespaces',
}

// Flags that require a value (cannot be boolean)
const FLAGS_REQUIRING_VALUES = ['n', 'namespace', 'o', 'output', 'l', 'selector', 'tail']
// Note: 'filename' is required for apply/create, but 'f' and 'follow' are boolean for logs

// Output formats for kubectl commands
type OutputFormat = 'table' | 'yaml' | 'json'
const VALID_OUTPUT_FORMATS = new Set<OutputFormat>(['table', 'yaml', 'json'])

// Kubectl resources: canonical name -> list of aliases
const KUBECTL_RESOURCES = {
    pods: ['pods', 'pod', 'po'],
    deployments: ['deployments', 'deployment', 'deploy'],
    services: ['services', 'service', 'svc'],
    namespaces: ['namespaces', 'namespace', 'ns'],
    configmaps: ['configmaps', 'configmap', 'cm'],
    secrets: ['secrets', 'secret'],
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

// ─── Action-Specific Transformers ────────────────────────────────────────
// Strategy pattern: each action has its own transformation logic

type ActionTransformer = (ctx: ParseContext) => Result<ParseContext>

/**
 * Transformer for exec command: sets resource and extracts command after -- separator
 */
const execTransformer: ActionTransformer = (ctx) => {
    if (!ctx.tokens) {
        return success(ctx)
    }

    // Set resource to pods (exec always targets pods)
    let updatedCtx = { ...ctx, resource: 'pods' as Resource }

    // Find the -- separator
    const separatorIndex = ctx.tokens.indexOf('--')
    if (separatorIndex === -1) {
        return success(updatedCtx)
    }

    // Everything after -- is the exec command
    const execCommand = ctx.tokens.slice(separatorIndex + 1)

    // Remove exec command from tokens so flag parsing doesn't see it
    const newTokens = ctx.tokens.slice(0, separatorIndex)

    return success({ ...updatedCtx, tokens: newTokens, execCommand })
}

/**
 * Transformer for apply/create: sets default resource to pods
 */
const applyCreateTransformer: ActionTransformer = (ctx) => {
    return success({ ...ctx, resource: 'pods' as Resource })
}

/**
 * Transformer for logs: sets resource to pods
 */
const logsTransformer: ActionTransformer = (ctx) => {
    return success({ ...ctx, resource: 'pods' as Resource })
}

/**
 * Default transformer: no-op, returns context as-is
 */
const identityTransformer: ActionTransformer = (ctx) => success(ctx)

/**
 * Map of action-specific transformers
 * Add new actions here without modifying the pipeline
 */
const ACTION_TRANSFORMERS: Record<string, ActionTransformer> = {
    'exec': execTransformer,
    'logs': logsTransformer,
    'apply': applyCreateTransformer,
    'create': applyCreateTransformer,
}

/**
 * Get transformer for an action (returns identity if none exists)
 */
const getTransformerForAction = (action?: Action): ActionTransformer => {
    if (!action) {
        return identityTransformer
    }
    return ACTION_TRANSFORMERS[action] || identityTransformer
}

/**
 * Main entry point for parsing kubectl commands
 * 
 * Pipeline: validate input → tokenize → validate kubectl → extract action →
 *           apply action-specific transform → parse flags → extract resource/name → validate
 */
export const parseCommand = (input: string): Result<ParsedCommand> => {
    // Generic parsing pipeline (works for all commands)
    const genericPipeline = pipeResult<ParseContext>(
        trim,
        tokenize,
        checkKubectl,
        extract(1, VALID_ACTIONS, 'action', 'Invalid or missing action')
    )

    const genericResult = genericPipeline({ input })
    if (!genericResult.ok) {
        return genericResult
    }

    // Apply action-specific transformation
    const transformer = getTransformerForAction(genericResult.value.action)
    const transformedResult = transformer(genericResult.value)
    if (!transformedResult.ok) {
        return transformedResult
    }

    // Continue with common parsing
    const commandPipeline = pipeResult<ParseContext>(
        parseFlags(1, FLAG_ALIASES),
        checkFlags(FLAGS_REQUIRING_VALUES),
        extractResource,
        extractName,
        checkSemantics,
        build
    )

    const result = commandPipeline(transformedResult.value)

    // Transform ParseContext result to ParsedCommand result
    if (!result.ok) {
        return result
    }

    // Extract the command from the final context
    const ctx = result.value
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
        execCommand: ctx.execCommand,
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

const extractResource = (ctx: ParseContext): Result<ParseContext> => {
    // Skip if resource already set by transformer
    if (ctx.resource) {
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

/**
 * Find name by skipping flags - works for dynamic position commands (logs/exec/apply/create)
 */
const findNameSkippingFlags = (tokens: string[], startPos: number): string | undefined => {
    for (let i = startPos; i < tokens.length; i++) {
        const token = tokens[i]

        if (token === '--') {
            break  // Stop at -- separator (for exec)
        }

        if (token.startsWith('-')) {
            // Skip flag and its value if needed
            const flagName = token.replace(/^-+/, '')
            if (FLAGS_REQUIRING_VALUES.includes(flagName)) {
                i++
            }
            continue
        }

        return token  // Found it!
    }

    return undefined
}

/**
 * Find name at fixed position - works for standard commands (get/describe/delete)
 */
const findNameAtPosition = (tokens: string[], position: number): string | undefined => {
    if (tokens.length <= position) {
        return undefined
    }

    const token = tokens[position]
    return token.startsWith('-') ? undefined : token
}

const extractName = (ctx: ParseContext): Result<ParseContext> => {
    if (!ctx.tokens) {
        return success(ctx)
    }

    const hasTransformer = ctx.action && ACTION_TRANSFORMERS[ctx.action]

    const name = hasTransformer
        ? findNameSkippingFlags(ctx.tokens, 2)  // Position 2: kubectl <action> <name>
        : findNameAtPosition(ctx.tokens, 3)     // Position 3: kubectl <action> <resource> <name>

    return success({ ...ctx, name })
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

    if (typeof output === 'string' && VALID_OUTPUT_FORMATS.has(output as OutputFormat)) {
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
    if ((action === 'delete' || action === 'describe' || action === 'logs' || action === 'exec') && !name) {
        return `${action} requires a resource name`
    }
    return undefined
}

