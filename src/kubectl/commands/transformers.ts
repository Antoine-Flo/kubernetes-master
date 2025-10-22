import type { Result } from '../../shared/result'
import { error, success } from '../../shared/result'
import type { Action, Resource } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// KUBECTL COMMAND TRANSFORMERS
// ═══════════════════════════════════════════════════════════════════════════
// Action-specific transformers for kubectl command parsing
// Each action can have custom logic to extract specific fields from tokens

// ─── Types ───────────────────────────────────────────────────────────────

/**
 * Internal parsing context that accumulates state through the pipeline
 */
export type ParseContext = {
    input: string
    tokens?: string[]
    action?: Action
    resource?: Resource
    name?: string
    flags?: Record<string, string | boolean>
    normalizedFlags?: Record<string, string | boolean>
    execCommand?: string[]
    labelChanges?: Record<string, string | null>
    annotationChanges?: Record<string, string | null>
}

type ActionTransformer = (ctx: ParseContext) => Result<ParseContext>

// ─── Resource Alias Mapping ──────────────────────────────────────────────

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
const buildResourceAliasMap = (): Record<string, string> => {
    const map: Record<string, string> = {}
    for (const [canonical, aliases] of Object.entries(KUBECTL_RESOURCES)) {
        for (const alias of aliases) {
            map[alias] = canonical
        }
    }
    return map
}

const RESOURCE_ALIAS_MAP = buildResourceAliasMap()

// ─── Helper Functions ────────────────────────────────────────────────────

/**
 * Find name token skipping flags
 */
const findNameSkippingFlags = (tokens: string[], startIndex: number): string | undefined => {
    for (let i = startIndex; i < tokens.length; i++) {
        const token = tokens[i]
        if (!token.startsWith('-')) {
            return token
        }
    }
    return undefined
}

/**
 * Parse key-value changes from tokens (for label/annotate)
 * Supports: key=value (add/update) and key- (remove)
 */
const parseChanges = (tokens: string[]): Record<string, string | null> => {
    const changes: Record<string, string | null> = {}

    for (const token of tokens) {
        // Skip flags
        if (token.startsWith('-')) {
            continue
        }

        // Check for removal syntax: key-
        if (token.endsWith('-') && !token.includes('=')) {
            const key = token.slice(0, -1)
            if (key) {
                changes[key] = null
            }
            continue
        }

        // Check for key=value syntax
        if (token.includes('=')) {
            const [key, ...valueParts] = token.split('=')
            const value = valueParts.join('=') // Handle values with = in them
            if (key && value !== undefined) {
                changes[key] = value
            }
        }
    }

    return changes
}

// ─── Transformers ────────────────────────────────────────────────────────

/**
 * Transformer for exec command: sets resource and extracts command after -- separator
 */
const execTransformer: ActionTransformer = (ctx) => {
    if (!ctx.tokens) {
        return success(ctx)
    }

    // Set resource to pods (exec always targets pods)
    const updatedCtx = { ...ctx, resource: 'pods' as Resource }

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
 * Transformer for label command: sets resource, extracts name and label changes
 */
const labelTransformer: ActionTransformer = (ctx) => {
    if (!ctx.tokens) {
        return success(ctx)
    }

    // Extract resource from position 2
    const resourceToken = ctx.tokens[2]
    if (!resourceToken || resourceToken.startsWith('-')) {
        return error('Invalid or missing resource type')
    }

    // Map resource alias to canonical
    const resource = RESOURCE_ALIAS_MAP[resourceToken] as Resource | undefined
    if (!resource) {
        return error('Invalid or missing resource type')
    }

    // Extract name from position 3 (skip flags)
    const name = findNameSkippingFlags(ctx.tokens, 3)

    // Parse label changes from tokens after name
    // Skip: kubectl (0), label (1), resource (2), name (3)
    const changesTokens = ctx.tokens.slice(4)
    const labelChanges = parseChanges(changesTokens)

    return success({ ...ctx, resource, name, labelChanges })
}

/**
 * Transformer for annotate command: sets resource, extracts name and annotation changes
 */
const annotateTransformer: ActionTransformer = (ctx) => {
    if (!ctx.tokens) {
        return success(ctx)
    }

    // Extract resource from position 2
    const resourceToken = ctx.tokens[2]
    if (!resourceToken || resourceToken.startsWith('-')) {
        return error('Invalid or missing resource type')
    }

    // Map resource alias to canonical
    const resource = RESOURCE_ALIAS_MAP[resourceToken] as Resource | undefined
    if (!resource) {
        return error('Invalid or missing resource type')
    }

    // Extract name from position 3 (skip flags)
    const name = findNameSkippingFlags(ctx.tokens, 3)

    // Parse annotation changes from tokens after name
    // Skip: kubectl (0), annotate (1), resource (2), name (3)
    const changesTokens = ctx.tokens.slice(4)
    const annotationChanges = parseChanges(changesTokens)

    return success({ ...ctx, resource, name, annotationChanges })
}

/**
 * Default transformer: no-op, returns context as-is
 */
const identityTransformer: ActionTransformer = (ctx) => success(ctx)

/**
 * Map of action-specific transformers
 * Add new actions here without modifying the pipeline
 */
const ACTIONS_WITH_CUSTOM_PARSING: Record<string, ActionTransformer> = {
    'exec': execTransformer,
    'logs': logsTransformer,
    'apply': applyCreateTransformer,
    'create': applyCreateTransformer,
    'label': labelTransformer,
    'annotate': annotateTransformer,
}

/**
 * Get transformer for an action (returns identity if none exists)
 */
export const getTransformerForAction = (action?: Action): ActionTransformer => {
    if (!action) {
        return identityTransformer
    }
    return ACTIONS_WITH_CUSTOM_PARSING[action] || identityTransformer
}

