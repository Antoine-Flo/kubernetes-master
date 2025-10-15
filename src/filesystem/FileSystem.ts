import {
    createDirectory,
    createFile,
    type DirectoryNode,
    type FileNode,
    type FileSystemNode
} from './models'
import { getFileExtension, isValidExtension } from './models/File'

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                      FILESYSTEM STATE MANAGEMENT                      ║
// ╚═══════════════════════════════════════════════════════════════════════╝
// Virtual filesystem with tree structure and closure-based state.
// Supports navigation, file/directory operations with max depth validation (3 levels).

export interface FileSystemState {
    currentPath: string
    tree: DirectoryNode
}

export type Result<T, E> =
    | { type: 'success'; data: T }
    | { type: 'error'; message: E }

// ─── Path Operations ─────────────────────────────────────────────────────

/**
 * Resolve relative or absolute paths
 * Supports '..' (parent) and '.' (current) navigation
 */
export const resolvePath = (currentPath: string, targetPath: string): string => {
    if (targetPath.startsWith('/')) {
        return normalizePath(targetPath)
    }

    const parts = currentPath.split('/').filter(p => p.length > 0)
    const targetParts = targetPath.split('/').filter(p => p.length > 0)

    for (const part of targetParts) {
        if (part === '..') {
            // Go up one level (cannot go above root)
            if (parts.length > 0) {
                parts.pop()
            }
        } else if (part !== '.') {
            parts.push(part)
        }
    }

    return '/' + parts.join('/')
}

const normalizePath = (path: string): string => {
    const parts = path.split('/').filter(p => p.length > 0)
    return '/' + parts.join('/')
}

/**
 * Calculate directory depth (0 for root, 1 for /dir, etc.)
 * Max depth is 3 per spec requirement
 */
export const getDepth = (path: string): number => {
    if (path === '/') return 0
    const parts = path.split('/').filter(p => p.length > 0)
    return parts.length
}

/**
 * Validate filename against forbidden characters
 * Forbidden: spaces, *, ?, <, >, |
 */
export const validateFilename = (name: string): boolean => {
    if (!name || name.length === 0) return false

    const forbidden = /[\s*?<>|]/
    return !forbidden.test(name)
}

// ─── Tree Operations ─────────────────────────────────────────────────────

/**
 * Find node in tree by absolute path
 * Returns undefined if not found
 */
export const findNode = (
    tree: DirectoryNode,
    path: string
): FileSystemNode | undefined => {
    if (path === '/') return tree

    const parts = path.split('/').filter(p => p.length > 0)
    let current: FileSystemNode = tree

    for (const part of parts) {
        if (current.type !== 'directory') return undefined

        const child = current.children.get(part)
        if (!child) return undefined

        current = child
    }

    return current
}

// ───────────────────────────────────────────────────────────────────────────
// Mutation
// ───────────────────────────────────────────────────────────────────────────

/**
 * Insert node into tree at path
 * Note: Currently mutates tree (not fully immutable)
 * TODO(Phase 2): Make truly immutable with structural sharing
 */
export const insertNode = (
    tree: DirectoryNode,
    path: string,
    node: FileSystemNode
): DirectoryNode => {
    if (path === '/') return tree

    const parts = path.split('/').filter(p => p.length > 0)
    const name = parts[parts.length - 1]
    const parentPath = '/' + parts.slice(0, -1).join('/')

    const parent = findNode(tree, parentPath)
    if (!parent || parent.type !== 'directory') return tree

    // Side effect: mutates parent.children Map
    parent.children.set(name, node)
    return tree
}

/**
 * Remove node from tree at path
 */
export const removeNode = (
    tree: DirectoryNode,
    path: string
): DirectoryNode => {
    if (path === '/') return tree

    const parts = path.split('/').filter(p => p.length > 0)
    const name = parts[parts.length - 1]
    const parentPath = '/' + parts.slice(0, -1).join('/')

    const parent = findNode(tree, parentPath)
    if (!parent || parent.type !== 'directory') return tree

    parent.children.delete(name)
    return tree
}

/**
 * Create directories recursively (mkdir -p behavior)
 */
const createDirectoriesRecursive = (
    tree: DirectoryNode,
    absolutePath: string
): void => {
    const parts = absolutePath.split('/').filter(p => p.length > 0)
    let currentPath = '/'

    for (const part of parts) {
        currentPath = currentPath === '/' ? `/${part}` : `${currentPath}/${part}`
        const node = findNode(tree, currentPath)

        if (!node) {
            const dir = createDirectory(part, currentPath)
            insertNode(tree, currentPath, dir)
        }
    }
}

/**
 * Create single directory (non-recursive)
 */
const createSingleDirectory = (
    tree: DirectoryNode,
    absolutePath: string
): Result<void, string> => {
    const parts = absolutePath.split('/').filter(p => p.length > 0)
    const parentPath = '/' + parts.slice(0, -1).join('/')
    const parent = findNode(tree, parentPath)

    if (!parent || parent.type !== 'directory') {
        return { type: 'error', message: `Parent directory not found: ${parentPath}` }
    }

    const dirName = parts[parts.length - 1]
    const dir = createDirectory(dirName, absolutePath)
    insertNode(tree, absolutePath, dir)

    return { type: 'success', data: undefined }
}

// ─── Validation Helpers ──────────────────────────────────────────────────

/**
 * Validate directory creation constraints
 */
const validateDirectoryCreation = (
    name: string,
    absolutePath: string,
    tree: DirectoryNode
): Result<void, string> => {
    if (!validateFilename(name.split('/').pop() || '')) {
        return { type: 'error', message: `Invalid directory name: ${name}` }
    }

    // Max depth check (spec requirement)
    if (getDepth(absolutePath) > 3) {
        return { type: 'error', message: `Max depth of 3 exceeded: ${absolutePath}` }
    }

    const existing = findNode(tree, absolutePath)
    if (existing) {
        return { type: 'error', message: `Directory already exists: ${absolutePath}` }
    }

    return { type: 'success', data: undefined }
}

/**
 * Validate file creation constraints
 */
const validateFileCreation = (
    name: string,
    absolutePath: string,
    currentPath: string,
    tree: DirectoryNode
): Result<void, string> => {
    if (!validateFilename(name)) {
        return { type: 'error', message: `Invalid filename: ${name}` }
    }

    // Files don't add to depth - check parent directory depth only
    if (getDepth(currentPath) > 3) {
        return { type: 'error', message: `Max depth of 3 exceeded: ${absolutePath}` }
    }

    const existing = findNode(tree, absolutePath)
    if (existing) {
        return { type: 'error', message: `File already exists: ${absolutePath}` }
    }

    const ext = getFileExtension(name)
    if (!isValidExtension(ext)) {
        return { type: 'error', message: `Unsupported file extension: ${ext}` }
    }

    return { type: 'success', data: undefined }
}

/**
 * Validate node is a directory
 */
const validateIsDirectory = (
    node: FileSystemNode | undefined,
    path: string
): Result<DirectoryNode, string> => {
    if (!node) {
        return { type: 'error', message: `Directory not found: ${path}` }
    }

    if (node.type !== 'directory') {
        return { type: 'error', message: `Not a directory: ${path}` }
    }

    return { type: 'success', data: node }
}

/**
 * Validate node is a file
 */
const validateIsFile = (
    node: FileSystemNode | undefined,
    path: string
): Result<FileNode, string> => {
    if (!node) {
        return { type: 'error', message: `File not found: ${path}` }
    }

    if (node.type !== 'file') {
        return { type: 'error', message: `Not a file: ${path}` }
    }

    return { type: 'success', data: node }
}

// ─── Navigation Operations ───────────────────────────────────────────────

const createNavigationOps = (getState: () => FileSystemState, setState: (s: FileSystemState) => void) => ({
    getCurrentPath: (): string => {
        return getState().currentPath
    },

    changeDirectory: (path: string): Result<string, string> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, path)
        const node = findNode(state.tree, absolutePath)

        const validation = validateIsDirectory(node, absolutePath)
        if (validation.type === 'error') return validation

        setState({ ...state, currentPath: absolutePath })
        return { type: 'success', data: absolutePath }
    },

    listDirectory: (path?: string): Result<FileSystemNode[], string> => {
        const state = getState()
        const targetPath = path ? resolvePath(state.currentPath, path) : state.currentPath
        const node = findNode(state.tree, targetPath)

        const validation = validateIsDirectory(node, targetPath)
        if (validation.type === 'error') return validation

        return { type: 'success', data: Array.from(validation.data.children.values()) }
    }
})

// ─── Directory Operations ────────────────────────────────────────────────

const createDirectoryOps = (getState: () => FileSystemState) => ({
    createDirectory: (name: string, recursive = false): Result<string, string> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, name)

        const validation = validateDirectoryCreation(name, absolutePath, state.tree)
        if (validation.type === 'error') return validation

        if (recursive) {
            createDirectoriesRecursive(state.tree, absolutePath)
            return { type: 'success', data: absolutePath }
        }

        const result = createSingleDirectory(state.tree, absolutePath)
        if (result.type === 'error') return result

        return { type: 'success', data: absolutePath }
    },

    deleteDirectory: (path: string, recursive = false): Result<void, string> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, path)

        if (absolutePath === '/') {
            return { type: 'error', message: 'Cannot delete root directory' }
        }

        const node = findNode(state.tree, absolutePath)
        const validation = validateIsDirectory(node, absolutePath)
        if (validation.type === 'error') return validation

        if (!recursive && validation.data.children.size > 0) {
            return { type: 'error', message: `Directory not empty: ${absolutePath}` }
        }

        removeNode(state.tree, absolutePath)
        return { type: 'success', data: undefined }
    }
})

// ─── File Operations ─────────────────────────────────────────────────────

const createFileOps = (getState: () => FileSystemState) => ({
    createFile: (name: string, content = ''): Result<FileNode, string> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, name)

        const validation = validateFileCreation(
            name,
            absolutePath,
            state.currentPath,
            state.tree
        )
        if (validation.type === 'error') return validation

        try {
            const file = createFile(name, absolutePath, content)
            insertNode(state.tree, absolutePath, file)
            return { type: 'success', data: file }
        } catch (error) {
            return { type: 'error', message: (error as Error).message }
        }
    },

    readFile: (path: string): Result<string, string> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, path)
        const node = findNode(state.tree, absolutePath)

        const validation = validateIsFile(node, absolutePath)
        if (validation.type === 'error') return validation

        return { type: 'success', data: validation.data.content }
    },

    writeFile: (path: string, content: string): Result<void, string> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, path)
        const node = findNode(state.tree, absolutePath)

        const validation = validateIsFile(node, absolutePath)
        if (validation.type === 'error') return validation

        // Side effect: Update file with new content and modifiedAt timestamp
        const updatedFile = createFile(validation.data.name, validation.data.path, content)
        removeNode(state.tree, absolutePath)
        insertNode(state.tree, absolutePath, updatedFile)

        return { type: 'success', data: undefined }
    },

    deleteFile: (path: string): Result<void, string> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, path)
        const node = findNode(state.tree, absolutePath)

        const validation = validateIsFile(node, absolutePath)
        if (validation.type === 'error') return validation

        removeNode(state.tree, absolutePath)
        return { type: 'success', data: undefined }
    }
})

// ─── State Management ────────────────────────────────────────────────────

const createStateOps = (getState: () => FileSystemState, setState: (s: FileSystemState) => void) => ({
    toJSON: (): FileSystemState => {
        const state = getState()

        const cloneNode = (node: FileSystemNode): FileSystemNode => {
            if (node.type === 'file') {
                return createFile(node.name, node.path, node.content)
            }

            const dir = createDirectory(node.name, node.path)
            for (const [key, child] of node.children) {
                dir.children.set(key, cloneNode(child))
            }
            return dir
        }

        return {
            currentPath: state.currentPath,
            tree: cloneNode(state.tree) as DirectoryNode
        }
    },

    loadState: (newState: FileSystemState): void => {
        setState(newState)
    }
})

/**
 * Create FileSystem instance with closure-based state management
 */
export const createFileSystem = (initialState?: FileSystemState) => {
    let state: FileSystemState = initialState || {
        currentPath: '/',
        tree: createDirectory('root', '/')
    }

    const getState = () => state
    const setState = (newState: FileSystemState) => { state = newState }

    return {
        ...createNavigationOps(getState, setState),
        ...createDirectoryOps(getState),
        ...createFileOps(getState),
        ...createStateOps(getState, setState)
    }
}
