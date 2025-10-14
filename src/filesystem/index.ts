// Public API for filesystem module (library-ready)
// Zero dependencies on kubectl or cluster modules

// Export models
export * from './models'

// Export FileSystem
export {
    createFileSystem,
    resolvePath,
    getDepth,
    validateFilename,
    findNode,
    insertNode,
    removeNode,
    type FileSystemState,
    type Result
} from './FileSystem'

// Export seed data
export { createSeedFileSystem } from './seedFileSystem'

