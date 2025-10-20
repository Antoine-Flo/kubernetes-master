// Supported file extensions registry
const SUPPORTED_EXTENSIONS = Object.freeze(['.yaml', '.yml', '.json', '.kyaml'])

// File node interface
export interface FileNode {
    readonly type: 'file'
    readonly name: string
    readonly path: string
    readonly content: string
    readonly extension: string
    readonly createdAt: string
    readonly modifiedAt: string
}

// Pure function: Extract file extension from filename (internal use only)
export const getFileExtension = (filename: string): string => {
    // Handle paths - get just the filename
    const parts = filename.split('/')
    const name = parts[parts.length - 1]

    const lastDot = name.lastIndexOf('.')
    if (lastDot === -1 || lastDot === 0) return ''

    return name.substring(lastDot)
}

// Pure function: Validate extension (internal use only)
export const isValidExtension = (extension: string): boolean => {
    return SUPPORTED_EXTENSIONS.includes(extension)
}

// Factory function: Create immutable file
export const createFile = (
    name: string,
    path: string,
    content: string = ''
): FileNode => {
    const extension = getFileExtension(name)

    if (!isValidExtension(extension)) {
        throw new Error(`Unsupported file extension: ${extension}`)
    }

    const now = new Date().toISOString()

    return Object.freeze({
        type: 'file',
        name,
        path,
        content,
        extension,
        createdAt: now,
        modifiedAt: now
    })
}

