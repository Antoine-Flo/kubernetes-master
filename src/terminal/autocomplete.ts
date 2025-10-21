import type { ClusterState } from '../cluster/ClusterState'
import type { createFileSystem } from '../filesystem/FileSystem'
import { compareStrings } from '../shared/formatter'
import { VALID_COMMANDS } from '../shell/commands/parser'

type FileSystem = ReturnType<typeof createFileSystem>

// ═══════════════════════════════════════════════════════════════════════════
// TERMINAL AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════════════════════
// Bash-like tab autocompletion for commands, kubectl resources, and file paths.
// Pure functions for completion logic with context-aware suggestions.

export interface AutocompleteContext {
    clusterState: ClusterState
    fileSystem: FileSystem
}

// ─── Constants ───────────────────────────────────────────────────────────

const COMMANDS = ['kubectl', ...VALID_COMMANDS]
const KUBECTL_ACTIONS = ['get', 'describe', 'delete', 'apply', 'create', 'logs', 'exec']
const KUBECTL_RESOURCES = ['pods', 'pod', 'po', 'deployments', 'deployment', 'deploy', 'services', 'service', 'svc', 'namespaces', 'namespace', 'ns', 'configmaps', 'configmap', 'cm', 'secrets', 'secret']
const KUBECTL_FLAGS = ['-n', '--namespace', '-o', '--output', '-l', '--selector', '-f', '--filename', '-A', '--all-namespaces', '--tail', '--follow', '-i', '-t', '-it']
const SHELL_FLAGS = ['-l', '-r', '-p']

// ─── File Completion Configuration ───────────────────────────────────────

interface FileCompletionOptions {
    directoriesOnly?: boolean    // Only suggest directories (e.g., cd)
    filesOnly?: boolean          // Only suggest files (e.g., cat, nano)
    extensions?: string[]        // Filter by extensions (e.g., ['.yaml', '.yml'])
}

const COMMAND_FILE_COMPLETION: Record<string, FileCompletionOptions> = {
    'cd': { directoriesOnly: true },
    'cat': { filesOnly: true },
    'nano': { filesOnly: true, extensions: ['.yaml', '.yml', '.json', '.txt', '.kyaml'] },
    'vi': { filesOnly: true, extensions: ['.yaml', '.yml', '.json', '.txt', '.kyaml'] },
    'vim': { filesOnly: true, extensions: ['.yaml', '.yml', '.json', '.txt', '.kyaml'] },
    'ls': {},  // All files and directories
    'rm': {},  // All files and directories
}

// Resource type to canonical mapping
const RESOURCE_CANONICAL: Record<string, string> = {
    'pods': 'pods',
    'pod': 'pods',
    'po': 'pods',
    'deployments': 'deployments',
    'deployment': 'deployments',
    'deploy': 'deployments',
    'services': 'services',
    'service': 'services',
    'svc': 'services',
    'namespaces': 'namespaces',
    'namespace': 'namespaces',
    'ns': 'namespaces',
    'configmaps': 'configmaps',
    'configmap': 'configmaps',
    'cm': 'configmaps',
    'secrets': 'secrets',
    'secret': 'secrets',
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Get all completion suggestions for the current line
 * Returns matching strings based on context (commands, resources, files, etc.)
 */
export const getCompletions = (currentLine: string, context: AutocompleteContext): string[] => {
    const tokens = tokenize(currentLine)
    const currentToken = getCurrentToken(currentLine)

    // Empty line or first token - complete commands
    if (tokens.length === 0 || (tokens.length === 1 && !currentLine.endsWith(' '))) {
        return filterMatches(COMMANDS, currentToken)
    }

    const command = tokens[0]

    // kubectl command completions
    if (command === 'kubectl') {
        return getKubectlCompletions(tokens, currentToken, context, currentLine)
    }

    // Shell command completions
    return getShellCompletions(currentToken, context, command)
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
    if (suggestions.length === 0) return ''
    if (suggestions.length === 1) return suggestions[0]

    // Simple column format - 4 items per row with padding
    const itemsPerRow = 4
    const rows: string[] = []

    for (let i = 0; i < suggestions.length; i += itemsPerRow) {
        const row = suggestions.slice(i, i + itemsPerRow)
        rows.push(row.map(item => item.padEnd(20)).join(''))
    }

    return rows.join('\r\n')
}

// ─── Kubectl Completions ─────────────────────────────────────────────────

const getKubectlCompletions = (
    tokens: string[],
    currentToken: string,
    context: AutocompleteContext,
    currentLine: string
): string[] => {
    // kubectl <action>
    if (tokens.length === 1 || (tokens.length === 2 && !currentLine.endsWith(' '))) {
        return filterMatches(KUBECTL_ACTIONS, currentToken)
    }

    const action = tokens[1]

    // Handle flags
    if (currentToken.startsWith('-')) {
        return filterMatches(KUBECTL_FLAGS, currentToken)
    }

    // kubectl apply/create -f <file>
    if ((action === 'apply' || action === 'create') && currentLine.includes('-f')) {
        return getFileCompletions(currentToken, context.fileSystem, {
            filesOnly: true,
            extensions: ['.yaml', '.yml']
        })
    }

    // kubectl logs/exec <pod-name> (position 2, no resource type)
    if (action === 'logs' || action === 'exec') {
        return getResourceNameCompletions('pods', currentToken, context)
    }

    // kubectl <action> <resource>
    if (tokens.length === 2 || (tokens.length === 3 && !currentLine.endsWith(' '))) {
        return filterMatches(KUBECTL_RESOURCES, currentToken)
    }

    // kubectl <action> <resource> <name>
    const resource = tokens[2]
    const canonicalResource = RESOURCE_CANONICAL[resource]

    if (canonicalResource) {
        return getResourceNameCompletions(canonicalResource, currentToken, context)
    }

    return []
}

const getResourceNameCompletions = (
    resource: string,
    currentToken: string,
    context: AutocompleteContext
): string[] => {
    let names: string[] = []

    if (resource === 'pods') {
        names = context.clusterState.getPods().map(pod => pod.metadata.name)
    } else if (resource === 'configmaps') {
        names = context.clusterState.getConfigMaps().map(cm => cm.metadata.name)
    } else if (resource === 'secrets') {
        names = context.clusterState.getSecrets().map(secret => secret.metadata.name)
    }
    // TODO: Add getDeployments, getServices, getNamespaces when implemented in ClusterState

    return filterMatches(names, currentToken)
}

// ─── Shell Completions ───────────────────────────────────────────────────

const getShellCompletions = (
    currentToken: string,
    context: AutocompleteContext,
    command: string
): string[] => {
    // Handle flags
    if (currentToken.startsWith('-')) {
        return filterMatches(SHELL_FLAGS, currentToken)
    }

    // Check if command has file completion config
    const fileCompletionConfig = COMMAND_FILE_COMPLETION[command]
    if (fileCompletionConfig !== undefined) {
        return getFileCompletions(currentToken, context.fileSystem, fileCompletionConfig)
    }

    return []
}

// ─── File System Completions ─────────────────────────────────────────────

const getFileCompletions = (
    currentToken: string,
    fileSystem: FileSystem,
    options: FileCompletionOptions = {}
): string[] => {
    const currentPath = fileSystem.getCurrentPath()
    let targetPath = currentPath

    // Handle absolute paths
    if (currentToken.startsWith('/')) {
        targetPath = currentToken
        // Get parent directory for listing
        const lastSlash = targetPath.lastIndexOf('/')
        if (lastSlash > 0) {
            targetPath = targetPath.slice(0, lastSlash)
        } else {
            targetPath = '/'
        }
    }

    const listing = fileSystem.listDirectory(targetPath)
    if (!listing.ok) {
        return []
    }

    let entries = listing.value

    // Filter by type
    if (options.directoriesOnly) {
        entries = entries.filter(e => e.type === 'directory')
    } else if (options.filesOnly) {
        entries = entries.filter(e => e.type === 'file')
    }

    // Filter by extensions
    if (options.extensions && options.extensions.length > 0) {
        const extensions = options.extensions
        entries = entries.filter(e => {
            if (e.type === 'directory') return false
            return extensions.some(ext => e.name.endsWith(ext))
        })
    }

    // Extract names
    let names = entries.map(e => e.name)

    // Handle absolute path completion - prefix with path
    if (currentToken.startsWith('/')) {
        const prefix = targetPath === '/' ? '/' : targetPath + '/'
        names = names.map(name => prefix + name)
    }

    return filterMatches(names, currentToken)
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
    if (input.endsWith(' ')) return ''

    const lastSpace = input.lastIndexOf(' ')
    if (lastSpace === -1) return input

    return input.slice(lastSpace + 1)
}

/**
 * Filter array to items that start with prefix (case-sensitive)
 */
const filterMatches = (items: string[], prefix: string): string[] => {
    if (!prefix) return items
    return items.filter(item => item.startsWith(prefix))
}

