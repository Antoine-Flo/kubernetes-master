import { describe, it, expect, beforeEach } from 'vitest'
import { handleNano } from '../../../../../src/shell/commands/handlers/nano'
import { createFileSystem } from '../../../../../src/filesystem/FileSystem'
import { createLogger } from '../../../../../src/logger/Logger'
import type { EditorModal } from '../../../../../src/editor/EditorModal'

describe('handleNano', () => {
    let fileSystem: ReturnType<typeof createFileSystem>
    let logger: ReturnType<typeof createLogger>
    let mockEditorModal: EditorModal
    let openCalls: Array<{ filename: string; content: string }>
    let lastSaveCallback: ((content: string) => void) | null

    beforeEach(() => {
        const fsState = {
            currentPath: '/',
            tree: {
                type: 'directory' as const,
                name: '/',
                path: '/',
                children: new Map()
            }
        }
        fileSystem = createFileSystem(fsState)
        logger = createLogger()
        openCalls = []
        lastSaveCallback = null

        // Mock EditorModal
        mockEditorModal = {
            open: (filename: string, content: string, onSave: (content: string) => void) => {
                openCalls.push({ filename, content })
                lastSaveCallback = onSave
            },
            close: () => {
                // Mock close
            }
        }
    })

    it('should return error if no filename provided', () => {
        const result = handleNano(logger, fileSystem, mockEditorModal, [])

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toBe('nano: missing file operand')
        }
    })

    it('should open editor with existing file content', () => {
        // Create a file
        fileSystem.createFile('test.yaml')
        fileSystem.writeFile('test.yaml', 'existing content')

        const result = handleNano(logger, fileSystem, mockEditorModal, ['test.yaml'])

        expect(result.ok).toBe(true)
        expect(openCalls.length).toBe(1)
        expect(openCalls[0].filename).toBe('test.yaml')
        expect(openCalls[0].content).toBe('existing content')
    })

    it('should open editor with empty content for non-existent file', () => {
        const result = handleNano(logger, fileSystem, mockEditorModal, ['new-file.yaml'])

        expect(result.ok).toBe(true)
        expect(openCalls.length).toBe(1)
        expect(openCalls[0].filename).toBe('new-file.yaml')
        expect(openCalls[0].content).toBe('')
    })

    it('should save file when save callback is invoked', () => {
        const result = handleNano(logger, fileSystem, mockEditorModal, ['new-file.yaml'])

        expect(result.ok).toBe(true)
        expect(lastSaveCallback).not.toBeNull()

        // Invoke save callback - handler should create the file automatically
        if (lastSaveCallback) {
            lastSaveCallback('new content')
        }

        // File should be created and saved
        const readResult = fileSystem.readFile('new-file.yaml')
        expect(readResult.ok).toBe(true)
        if (readResult.ok) {
            expect(readResult.value).toBe('new content')
        }
    })

    it('should update existing file when save callback is invoked', () => {
        // Create initial file
        fileSystem.createFile('existing.yaml')
        fileSystem.writeFile('existing.yaml', 'old content')

        const result = handleNano(logger, fileSystem, mockEditorModal, ['existing.yaml'])

        expect(result.ok).toBe(true)

        // Invoke save callback with new content
        if (lastSaveCallback) {
            lastSaveCallback('updated content')
        }

        // File should be updated
        const readResult = fileSystem.readFile('existing.yaml')
        expect(readResult.ok).toBe(true)
        if (readResult.ok) {
            expect(readResult.value).toBe('updated content')
        }
    })

    it('should handle file path with directory', () => {
        // Create directory and file
        fileSystem.createDirectory('manifests')
        fileSystem.changeDirectory('manifests')
        fileSystem.createFile('pod.yaml')
        fileSystem.writeFile('pod.yaml', 'pod content')
        fileSystem.changeDirectory('..')

        const result = handleNano(logger, fileSystem, mockEditorModal, ['manifests/pod.yaml'])

        expect(result.ok).toBe(true)
        expect(openCalls.length).toBe(1)
        expect(openCalls[0].filename).toBe('manifests/pod.yaml')
        expect(openCalls[0].content).toBe('pod content')
    })

    it('should return success immediately without blocking', () => {
        const result = handleNano(logger, fileSystem, mockEditorModal, ['test.yaml'])

        // Should return success immediately (modal handles async UI)
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toBe('')
        }
    })

    it('should log file operations', () => {
        // Open existing file
        fileSystem.createFile('test.yaml')
        handleNano(logger, fileSystem, mockEditorModal, ['test.yaml'])

        const logs = logger.getEntries()
        const commandLogs = logs.filter(log => log.category === 'COMMAND')

        expect(commandLogs.length).toBeGreaterThan(0)
        expect(commandLogs.some(log => log.message.includes('Opening editor'))).toBe(true)
    })

    it('should handle YAML file content correctly', () => {
        const yamlContent = `apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx:latest`

        fileSystem.createFile('pod.yaml')
        fileSystem.writeFile('pod.yaml', yamlContent)

        handleNano(logger, fileSystem, mockEditorModal, ['pod.yaml'])

        expect(openCalls[0].content).toBe(yamlContent)

        // Save modified content
        const modifiedYaml = yamlContent + '\n    ports:\n    - containerPort: 80'
        if (lastSaveCallback) {
            lastSaveCallback(modifiedYaml)
        }

        const readResult = fileSystem.readFile('pod.yaml')
        expect(readResult.ok).toBe(true)
        if (readResult.ok) {
            expect(readResult.value).toBe(modifiedYaml)
        }
    })
})

