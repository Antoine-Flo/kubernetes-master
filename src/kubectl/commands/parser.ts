import type { Action, Resource, ParsedCommand, CommandResult } from './types'

// Valid actions
const VALID_ACTIONS: Action[] = ['get', 'describe', 'delete', 'apply', 'create']

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
 * Pure function that takes a command string and returns a parsed result
 */
export const parseCommand = (input: string): CommandResult<ParsedCommand> => {
    // Trim and check for empty input
    const trimmed = input.trim()
    if (!trimmed) {
        return { type: 'error', message: 'Command cannot be empty' }
    }

    // Split into tokens, filtering out empty strings
    const tokens = trimmed.split(/\s+/).filter((t) => t.length > 0)

    // Validate kubectl prefix
    if (tokens.length === 0 || tokens[0] !== 'kubectl') {
        return { type: 'error', message: 'Command must start with kubectl' }
    }

    // Extract action (second token)
    const action = extractAction(tokens)
    if (!action) {
        return { type: 'error', message: 'Invalid or missing action' }
    }

    // For apply/create, resource might not be specified
    if (action === 'apply' || action === 'create') {
        const flags = parseFlags(tokens)
        return {
            type: 'success',
            data: {
                action,
                resource: 'pods' as Resource, // Default, will be determined from file content
                flags,
                namespace: flags.n || flags.namespace,
            },
        }
    }

    // Extract resource (third token, unless it's a flag)
    const resource = extractResource(tokens)
    if (!resource) {
        return { type: 'error', message: 'Invalid or missing resource type' }
    }

    // Extract resource name (fourth token, if present and not a flag)
    const name = extractResourceName(tokens)

    // Parse flags
    const flags = parseFlags(tokens)

    // Validate flags - ensure flag values are present
    const flagValidation = validateFlags(tokens)
    if (flagValidation) {
        return { type: 'error', message: flagValidation }
    }

    // Build parsed command
    const parsed: ParsedCommand = {
        action,
        resource,
        name,
        namespace: flags.n || flags.namespace,
        flags,
    }

    return { type: 'success', data: parsed }
}

/**
 * Extract action from tokens
 * Action is the second token (after kubectl)
 */
const extractAction = (tokens: string[]): Action | undefined => {
    if (tokens.length < 2) {
        return undefined
    }

    const action = tokens[1]
    return VALID_ACTIONS.includes(action as Action) ? (action as Action) : undefined
}

/**
 * Extract resource type from tokens
 * Resource is the third token (after kubectl and action)
 * Returns canonical resource name (e.g., po -> pods, deploy -> deployments)
 */
const extractResource = (tokens: string[]): Resource | undefined => {
    if (tokens.length < 3) {
        return undefined
    }

    const resource = tokens[2]

    // Skip if it's a flag
    if (resource.startsWith('-')) {
        return undefined
    }

    // Lookup canonical resource from alias map
    return RESOURCE_ALIAS_MAP[resource] as Resource | undefined
}

/**
 * Extract resource name from tokens
 * Resource name is the fourth token (if present and not a flag)
 */
const extractResourceName = (tokens: string[]): string | undefined => {
    if (tokens.length < 4) {
        return undefined
    }

    const name = tokens[3]

    // Skip if it's a flag
    if (name.startsWith('-')) {
        return undefined
    }

    return name
}

/**
 * Parse all flags from tokens
 * Flags start with - or --
 */
const parseFlags = (tokens: string[]): Record<string, string> => {
    const flags: Record<string, string> = {}

    for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i]

        // Check if token is a flag
        if (token.startsWith('-')) {
            const flagName = token.replace(/^-+/, '') // Remove leading dashes
            const flagValue = tokens[i + 1]

            // If there's a next token and it's not a flag, it's the value
            if (flagValue && !flagValue.startsWith('-')) {
                flags[flagName] = flagValue
                i++ // Skip the value token
            }
        }
    }

    return flags
}

/**
 * Validate that all flags have values
 */
const validateFlags = (tokens: string[]): string | undefined => {
    for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i]

        // Check if token is a flag
        if (token.startsWith('-')) {
            const nextToken = tokens[i + 1]

            // Flag must have a value (next token that's not a flag)
            if (!nextToken || nextToken.startsWith('-')) {
                return `flag ${token} requires a value`
            }
        }
    }

    return undefined
}

