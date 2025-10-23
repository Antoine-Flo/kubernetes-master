import type { Result } from '../shared/result'
import { error, success } from '../shared/result'
import {
    createDirectory,
    createFile,
    type DirectoryNode,
    type FileNode,
    type FileSystemNode
} from './models'

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                      FILESYSTEM STATE MANAGEMENT                      ║
// ╚═══════════════════════════════════════════════════════════════════════╝
// Virtual filesystem with tree structure and closure-based state.
// Supports navigation, file/directory operations with max depth validation (3 levels).

export interface FileSystemState {
    currentPath: string
    tree: DirectoryNode
}

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
const insertNode = (
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
const removeNode = (
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
): Result<void> => {
    const parts = absolutePath.split('/').filter(p => p.length > 0)
    const parentPath = '/' + parts.slice(0, -1).join('/')
    const parent = findNode(tree, parentPath)

    if (!parent || parent.type !== 'directory') {
        return error(`mkdir: cannot create directory '${absolutePath}': No such file or directory`)
    }

    const dirName = parts[parts.length - 1]
    const dir = createDirectory(dirName, absolutePath)
    insertNode(tree, absolutePath, dir)

    return success(undefined)
}

// ─── Validation Helpers ──────────────────────────────────────────────────

/**
 * Validate directory creation constraints
 */
const validateDirectoryCreation = (
    name: string,
    absolutePath: string,
    tree: DirectoryNode
): Result<void> => {
    if (!validateFilename(name.split('/').pop() || '')) {
        return error(`mkdir: cannot create directory '${name}': Invalid argument`)
    }

    const existing = findNode(tree, absolutePath)
    if (existing) {
        return error(`mkdir: cannot create directory '${absolutePath}': File exists`)
    }

    return success(undefined)
}

/**
 * Validate file creation constraints
 */
const validateFileCreation = (
    name: string,
    absolutePath: string,
    tree: DirectoryNode
): Result<void> => {
    if (!validateFilename(name)) {
        return error(`touch: cannot touch '${name}': Invalid argument`)
    }

    const existing = findNode(tree, absolutePath)
    if (existing) {
        return error(`touch: cannot touch '${absolutePath}': File exists`)
    }

    return success(undefined)
}

/**
 * Validate node is a directory
 */
const validateIsDirectory = (
    node: FileSystemNode | undefined,
    path: string,
    command: string = 'cd'
): Result<DirectoryNode> => {
    if (!node) {
        return error(`${command}: ${path}: No such file or directory`)
    }

    if (node.type !== 'directory') {
        return error(`${command}: ${path}: Not a directory`)
    }

    return success(node)
}

/**
 * Validate node is a file
 */
const validateIsFile = (
    node: FileSystemNode | undefined,
    path: string,
    command: string = 'cat'
): Result<FileNode> => {
    if (!node) {
        return error(`${command}: ${path}: No such file or directory`)
    }

    if (node.type !== 'file') {
        return error(`${command}: ${path}: Is a directory`)
    }

    return success(node)
}

// ─── Navigation Operations ───────────────────────────────────────────────

const createNavigationOps = (getState: () => FileSystemState, setState: (s: FileSystemState) => void) => ({
    getCurrentPath: (): string => {
        return getState().currentPath
    },

    changeDirectory: (path: string): Result<string> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, path)
        const node = findNode(state.tree, absolutePath)

        const validation = validateIsDirectory(node, absolutePath)
        if (!validation.ok) {
            return validation
        }

        setState({ ...state, currentPath: absolutePath })
        return success(absolutePath)
    },

    listDirectory: (path?: string): Result<FileSystemNode[]> => {
        const state = getState()
        const targetPath = path ? resolvePath(state.currentPath, path) : state.currentPath
        const node = findNode(state.tree, targetPath)

        const validation = validateIsDirectory(node, targetPath, 'ls')
        if (!validation.ok) {
            return validation
        }

        return success(Array.from(validation.value.children.values()))
    }
})

// ─── Directory Operations ────────────────────────────────────────────────

const createDirectoryOps = (getState: () => FileSystemState) => ({
    createDirectory: (name: string, recursive = false): Result<string> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, name)

        const validation = validateDirectoryCreation(name, absolutePath, state.tree)
        if (!validation.ok) {
            return validation
        }

        if (recursive) {
            createDirectoriesRecursive(state.tree, absolutePath)
            return success(absolutePath)
        }

        const result = createSingleDirectory(state.tree, absolutePath)
        if (!result.ok) return result

        return success(absolutePath)
    },

    deleteDirectory: (path: string, recursive = false): Result<void> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, path)

        if (absolutePath === '/') {
            return error(`rm: cannot remove '/': Invalid argument`)
        }

        const node = findNode(state.tree, absolutePath)
        if (!node) {
            return error(`rm: cannot remove '${absolutePath}': No such file or directory`)
        }
        
        if (node.type !== 'directory') {
            return error(`rm: cannot remove '${absolutePath}': Not a directory`)
        }

        if (!recursive && node.children.size > 0) {
            return error(`rm: cannot remove '${absolutePath}': Directory not empty`)
        }

        removeNode(state.tree, absolutePath)
        return success(undefined)
    }
})

// ─── File Operations ─────────────────────────────────────────────────────

const createFileOps = (getState: () => FileSystemState) => ({
    createFile: (name: string, content = ''): Result<FileNode> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, name)

        const validation = validateFileCreation(
            name,
            absolutePath,
            state.tree
        )
        if (!validation.ok) {
            return validation
        }

        try {
            const file = createFile(name, absolutePath, content)
            insertNode(state.tree, absolutePath, file)
            return success(file)
        } catch (err) {
            return error((err as Error).message)
        }
    },

    readFile: (path: string): Result<string> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, path)
        const node = findNode(state.tree, absolutePath)

        const validation = validateIsFile(node, absolutePath)
        if (!validation.ok) {
            return validation
        }

        return success(validation.value.content)
    },

    writeFile: (path: string, content: string): Result<void> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, path)
        const node = findNode(state.tree, absolutePath)

        const validation = validateIsFile(node, absolutePath, 'nano')
        if (!validation.ok) {
            return validation
        }

        // Side effect: Update file with new content and modifiedAt timestamp
        const updatedFile = createFile(validation.value.name, validation.value.path, content)
        removeNode(state.tree, absolutePath)
        insertNode(state.tree, absolutePath, updatedFile)

        return success(undefined)
    },

    deleteFile: (path: string): Result<void> => {
        const state = getState()
        const absolutePath = resolvePath(state.currentPath, path)
        const node = findNode(state.tree, absolutePath)

        const validation = validateIsFile(node, absolutePath, 'rm')
        if (!validation.ok) {
            return validation
        }

        removeNode(state.tree, absolutePath)
        return success(undefined)
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

/**
 * FileSystem type (inferred from factory return)
 */
export type FileSystem = ReturnType<typeof createFileSystem>