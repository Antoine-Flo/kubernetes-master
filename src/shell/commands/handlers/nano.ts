import type { ExecutionResult } from '../../../shared/result'
import { error, success } from '../../../shared/result'
import type { FileSystem } from '../executor'
import type { Logger } from '../../../logger/Logger'
import type { EditorModal } from '../../../editor/EditorModal'

// ═══════════════════════════════════════════════════════════════════════════
// NANO COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════════════════
// Opens the YAML editor modal for editing files.

/**
 * Handle nano command - open editor for a file
 * @param logger - Application logger
 * @param fileSystem - File system instance
 * @param editorModal - Editor modal instance
 * @param args - Command arguments (filename)
 * @returns ExecutionResult
 */
export const handleNano = (
    logger: Logger,
    fileSystem: FileSystem,
    editorModal: EditorModal,
    args: string[]
): ExecutionResult => {
    if (args.length === 0) {
        logger.error('COMMAND', 'nano: missing file operand')
        return error('nano: missing file operand')
    }

    const filename = args[0]
    logger.info('COMMAND', `Opening editor for: ${filename}`)

    // Try to read existing file
    const readResult = fileSystem.readFile(filename)
    let content = ''

    if (readResult.ok) {
        content = readResult.value
        logger.debug('FILESYSTEM', `File loaded: ${filename}`)
    } else {
        // File doesn't exist - will create on save
        logger.debug('FILESYSTEM', `New file: ${filename}`)
    }

    // Open editor modal
    editorModal.open(filename, content, (newContent: string) => {
        // Save callback - create file if it doesn't exist
        if (!readResult.ok) {
            const createResult = fileSystem.createFile(filename)
            if (!createResult.ok) {
                logger.error('FILESYSTEM', `Failed to create ${filename}: ${createResult.error}`)
                return
            }
        }

        const writeResult = fileSystem.writeFile(filename, newContent)
        if (writeResult.ok) {
            logger.info('FILESYSTEM', `File saved: ${filename}`)
        } else {
            logger.error('FILESYSTEM', `Failed to save ${filename}: ${writeResult.error}`)
        }
    })

    // Return success immediately - modal handles UI
    return success('')
}

