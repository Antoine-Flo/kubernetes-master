import {
    checkFlags,
    extract,
    parseFlags,
    parseSelector,
    pipeResult,
    tokenize,
    trim
} from '../../shared/parsing'
import type { Result } from '../../shared/result'
import { error, success } from '../../shared/result'
import { getTransformerForAction, type ParseContext } from './transformers'
import type { Action, ParsedCommand, Resource } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// KUBECTL COMMAND PARSER
// ═══════════════════════════════════════════════════════════════════════════
// Parses kubectl command strings with resource aliases and namespace flags.
// Supports all kubectl actions (get, describe, delete, apply, create).
// 
// Uses Railway-oriented programming (pipeResult) for clean pipeline composition.
// Each step transforms a ParseContext and can fail, stopping the pipeline.

// ─── Constants ───────────────────────────────────────────────────────────

const VALID_ACTIONS: Action[] = ['get', 'describe', 'delete', 'apply', 'create', 'logs', 'exec', 'label', 'annotate']

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

// ─── Main Parsing Pipeline ──────────────────────────────────────────────

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
        labelChanges: ctx.labelChanges,
        annotationChanges: ctx.annotationChanges,
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
    // Skip if name already set by transformer (check for property, not just truthiness)
    if ('name' in ctx && ctx.name !== undefined) {
        return success(ctx)
    }

    // Also skip for label/annotate since transformer handles name extraction
    if (ctx.action === 'label' || ctx.action === 'annotate') {
        return success(ctx)
    }

    if (!ctx.tokens) {
        return success(ctx)
    }

    // Actions with custom transformers parse name differently
    const actionsWithCustomParsing = ['exec', 'logs', 'apply', 'create', 'label', 'annotate']
    const hasTransformer = ctx.action && actionsWithCustomParsing.includes(ctx.action)

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
    if ((action === 'delete' || action === 'describe' || action === 'logs' || action === 'exec' || action === 'label' || action === 'annotate') && !name) {
        return `${action} requires a resource name`
    }
    return undefined
}

