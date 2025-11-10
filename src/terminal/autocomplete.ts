import type { ClusterState } from '../cluster/ClusterState'
import type { createFileSystem } from '../filesystem/FileSystem'
import { compareStrings } from '../shared/formatter'
import { VALID_COMMANDS } from '../shell/commands/parser'

type FileSystem = ReturnType<typeof createFileSystem>

// ═══════════════════════════════════════════════════════════════════════════
// TERMINAL AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════════════════════
// Bash-like tab autocompletion using Strategy Pattern.
// Clean architecture with separate strategies for each completion type.

export interface AutocompleteContext {
    clusterState: ClusterState
    fileSystem: FileSystem
}

interface CompletionResult {
    text: string
    suffix: string // ' ' for commands/files, '/' for directories
}

// ─── Constants ───────────────────────────────────────────────────────────

const COMMANDS = ['kubectl', ...VALID_COMMANDS]
const KUBECTL_ACTIONS = ['get', 'describe', 'delete', 'apply', 'logs', 'exec']
const FILE_COMMANDS = ['cd', 'ls', 'cat', 'nano', 'rm', 'vi', 'vim']

// Resource type aliases (for kubectl completion)
const RESOURCE_ALIASES: Record<string, string> = {
    'pods': 'pods',
    'pod': 'pods',
    'po': 'pods',
    'configmaps': 'configmaps',
    'configmap': 'configmaps',
    'cm': 'configmaps',
    'secrets': 'secrets',
    'secret': 'secrets',
}

// ─── Strategy Pattern ────────────────────────────────────────────────────

interface CompletionStrategy {
    match(tokens: string[], currentToken: string, line: string): boolean
    complete(tokens: string[], currentToken: string, context: AutocompleteContext): CompletionResult[]
}

// ─── Strategy Implementations ────────────────────────────────────────────

// Strategy 1: Complete command names
const createCommandStrategy = (): CompletionStrategy => ({
    match: (tokens: string[], _currentToken: string, line: string): boolean => {
        return tokens.length === 0 || (tokens.length === 1 && !line.endsWith(' '))
    },
    complete: (_tokens: string[], currentToken: string, _context: AutocompleteContext): CompletionResult[] => {
        return filterMatches(COMMANDS, currentToken).map(cmd => ({ text: cmd, suffix: ' ' }))
    }
})

// Strategy 2: Complete kubectl actions (get, describe, etc.)
const createKubectlActionStrategy = (): CompletionStrategy => ({
    match: (tokens: string[], _currentToken: string, line: string): boolean => {
        return tokens[0] === 'kubectl' && (tokens.length === 1 || (tokens.length === 2 && !line.endsWith(' ')))
    },
    complete: (_tokens: string[], currentToken: string, _context: AutocompleteContext): CompletionResult[] => {
        return filterMatches(KUBECTL_ACTIONS, currentToken).map(action => ({ text: action, suffix: ' ' }))
    }
})

// Strategy 3: Complete kubectl resource types (pods, configmaps, etc.)
const createKubectlResourceStrategy = (): CompletionStrategy => ({
    match: (tokens: string[], _currentToken: string, line: string): boolean => {
        if (tokens[0] !== 'kubectl' || tokens.length < 2) {
            return false
        }
        const action = tokens[1]
        // logs/exec take pod names directly (no resource type)
        if (action === 'logs' || action === 'exec') {
            return false
        }
        return tokens.length === 2 || (tokens.length === 3 && !line.endsWith(' '))
    },
    complete: (_tokens: string[], currentToken: string, _context: AutocompleteContext): CompletionResult[] => {
        const allResourceTypes = Object.keys(RESOURCE_ALIASES)
        return filterMatches(allResourceTypes, currentToken).map(resource => ({ text: resource, suffix: ' ' }))
    }
})

// Strategy 4: Complete resource names from cluster
const createResourceNameStrategy = (): CompletionStrategy => ({
    match: (tokens: string[], _currentToken: string, _line: string): boolean => {
        if (tokens[0] !== 'kubectl' || tokens.length < 2) {
            return false
        }
        const action = tokens[1]
        // logs/exec: position 2 is pod name
        if (action === 'logs' || action === 'exec') {
            return tokens.length >= 2
        }
        // Other actions: position 3 is resource name
        return tokens.length >= 3
    },
    complete: (tokens: string[], currentToken: string, context: AutocompleteContext): CompletionResult[] => {
        const action = tokens[1]
        let resourceType = 'pods'

        // For logs/exec, always use pods
        if (action === 'logs' || action === 'exec') {
            resourceType = 'pods'
        } else if (tokens.length >= 3) {
            // Map resource alias to canonical name
            const resource = tokens[2]
            resourceType = RESOURCE_ALIASES[resource] || resource
        }

        return getResourceNames(resourceType, currentToken, context)
    }
})

// Strategy 5: Complete file/directory names
const createFileStrategy = (): CompletionStrategy => ({
    match: (tokens: string[], _currentToken: string, _line: string): boolean => {
        if (tokens.length === 0) {
            return false
        }
        const command = tokens[0]
        return FILE_COMMANDS.includes(command)
    },
    complete: (tokens: string[], currentToken: string, context: AutocompleteContext): CompletionResult[] => {
        const command = tokens[0]
        const directoriesOnly = command === 'cd'
        return getFileCompletions(currentToken, context.fileSystem, directoriesOnly)
    }
})

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Get all completion suggestions for the current line
 * Returns matching strings based on context (commands, resources, files, etc.)
 */
export const getCompletions = (currentLine: string, context: AutocompleteContext): string[] => {
    const results = getCompletionResults(currentLine, context)
    return results.map(result => result.text)
}

/**
 * Get completion results with proper suffixes for directories vs files/commands
 */
export const getCompletionResults = (currentLine: string, context: AutocompleteContext): CompletionResult[] => {
    const tokens = tokenize(currentLine)
    const currentToken = getCurrentToken(currentLine)

    // Strategy pattern: try each strategy in order
    const strategies: CompletionStrategy[] = [
        createCommandStrategy(),
        createKubectlActionStrategy(),
        createKubectlResourceStrategy(),
        createResourceNameStrategy(),
        createFileStrategy(),
    ]

    for (const strategy of strategies) {
        if (strategy.match(tokens, currentToken, currentLine)) {
            return strategy.complete(tokens, currentToken, context)
        }
    }

    return []
}

/**
 * Find the longest common prefix among suggestions
 */
export const getCommonPrefix = (suggestions: string[]): string => {
    if (suggestions.length === 0) return ''
    if (suggestions.length === 1) return suggestions[0]

    const sorted = suggestions.slice().sort(compareStrings)
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    let i = 0

    while (i < first.length && first[i] === last[i]) {
        i++
    }

    return first.slice(0, i)
}

/**
 * Format suggestions for display (bash-like column format)
 */
export const formatSuggestions = (suggestions: string[]): string => {
    if (suggestions.length === 0) {
        return ''
    }
    if (suggestions.length === 1) {
        return suggestions[0]
    }

    // Simple column format - 4 items per row with padding
    const itemsPerRow = 4
    const rows: string[] = []

    for (let i = 0; i < suggestions.length; i += itemsPerRow) {
        const row = suggestions.slice(i, i + itemsPerRow)
        rows.push(row.map(item => item.padEnd(20)).join(''))
    }

    return rows.join('\r\n')
}

// ─── Helper Functions ────────────────────────────────────────────────────

/**
 * Get resource names from cluster state
 */
const getResourceNames = (
    resourceType: string,
    currentToken: string,
    context: AutocompleteContext
): CompletionResult[] => {
    let names: string[] = []

    if (resourceType === 'pods') {
        names = context.clusterState.getPods().map(pod => pod.metadata.name)
    } else if (resourceType === 'configmaps') {
        names = context.clusterState.getConfigMaps().map(cm => cm.metadata.name)
    } else if (resourceType === 'secrets') {
        names = context.clusterState.getSecrets().map(secret => secret.metadata.name)
    }

    return filterMatches(names, currentToken).map(name => ({ text: name, suffix: ' ' }))
}

/**
 * Get file/directory completions from filesystem (current directory only)
 */
const getFileCompletions = (
    currentToken: string,
    fileSystem: FileSystem,
    directoriesOnly: boolean
): CompletionResult[] => {
    const listing = fileSystem.listDirectory(fileSystem.getCurrentPath())
    if (!listing.ok) {
        return []
    }

    let entries = listing.value

    if (directoriesOnly) {
        entries = entries.filter(e => e.type === 'directory')
    }

    const names = entries.map(e => e.name)
    const matches = filterMatches(names, currentToken)

    return matches.map(name => {
        const isDir = entries.find(e => e.name === name)?.type === 'directory'
        return {
            text: name,
            suffix: isDir ? '/' : ' '
        }
    })
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Tokenize input by splitting on spaces (handles multiple spaces)
 */
const tokenize = (input: string): string[] => {
    return input.trim().split(/\s+/).filter(t => t.length > 0)
}

/**
 * Get the current token being typed (last token, even if incomplete)
 */
const getCurrentToken = (input: string): string => {
    if (input.endsWith(' ')) {
        return ''
    }

    const lastSpace = input.lastIndexOf(' ')
    if (lastSpace === -1) {
        return input
    }

    return input.slice(lastSpace + 1)
}

/**
 * Filter array to items that start with prefix (case-sensitive)
 */
const filterMatches = (items: string[], prefix: string): string[] => {
    if (!prefix) {
        return items
    }
    return items.filter(item => item.startsWith(prefix))
}
