import { beforeEach, describe, expect, it } from 'vitest'
import { createFileSystem } from '../../../../src/filesystem/FileSystem'
import { createLogger, type Logger } from '../../../../src/logger/Logger'
import { createShellExecutor, type FileSystem } from '../../../../src/shell/commands/executor'

describe('Shell Executor', () => {
    let fileSystem: FileSystem
    let logger: Logger
    let executor: ReturnType<typeof createShellExecutor>

    beforeEach(() => {
        // Create a fresh filesystem and logger for each test
        fileSystem = createFileSystem()
        logger = createLogger()
        executor = createShellExecutor(fileSystem, logger)
    })

    describe('pwd command', () => {
        it('should return current path at root', () => {
            const result = executor.execute('pwd')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('/')
            }
        })

        it('should return current path after cd', () => {
            fileSystem.createDirectory('test')
            fileSystem.changeDirectory('test')

            const result = executor.execute('pwd')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('/test')
            }
        })
    })

    describe('cd command', () => {
        it('should change to root when no args', () => {
            fileSystem.createDirectory('test')
            fileSystem.changeDirectory('test')

            const result = executor.execute('cd')

            expect(result.ok).toBe(true)
            expect(fileSystem.getCurrentPath()).toBe('/')
        })

        it('should change directory', () => {
            fileSystem.createDirectory('manifests')

            const result = executor.execute('cd manifests')

            expect(result.ok).toBe(true)
            expect(fileSystem.getCurrentPath()).toBe('/manifests')
        })

        it('should return error for non-existent directory', () => {
            const result = executor.execute('cd nonexistent')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('No such file or directory')
            }
        })
    })

    describe('ls command', () => {
        it('should list empty directory', () => {
            const result = executor.execute('ls')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('')
            }
        })

        it('should list directory contents', () => {
            fileSystem.createDirectory('examples')
            fileSystem.createDirectory('manifests')

            const result = executor.execute('ls')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('examples')
                expect(result.value).toContain('manifests')
            }
        })

        it('should list with -l flag', () => {
            fileSystem.createDirectory('examples')
            fileSystem.createFile('test.yaml')

            const result = executor.execute('ls -l')

            expect(result.ok).toBe(true)
            if (result.ok) {
                // New format uses formatLongListing: permissions, size, date, name
                expect(result.value).toContain('d---')  // directory permission
                expect(result.value).toContain('examples')  // directory name
                expect(result.value).toContain('----')  // file permission
                expect(result.value).toContain('test.yaml')  // file name
            }
        })

        it('should list specific path', () => {
            fileSystem.createDirectory('examples')
            fileSystem.changeDirectory('examples')
            fileSystem.createFile('pod.yaml')
            fileSystem.changeDirectory('/')

            const result = executor.execute('ls examples')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('pod.yaml')
            }
        })
    })

    describe('mkdir command', () => {
        it('should create directory', () => {
            const result = executor.execute('mkdir test')

            expect(result.ok).toBe(true)

            const listResult = fileSystem.listDirectory()
            if (listResult.ok) {
                const names = listResult.value.map(n => n.name)
                expect(names).toContain('test')
            }
        })

        it('should return error when name is missing', () => {
            const result = executor.execute('mkdir')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('missing operand')
            }
        })

        it('should handle -p flag', () => {
            const result = executor.execute('mkdir -p newdir')

            expect(result.ok).toBe(true)

            const listResult = fileSystem.listDirectory()
            if (listResult.ok) {
                const names = listResult.value.map(n => n.name)
                expect(names).toContain('newdir')
            }
        })
    })

    describe('touch command', () => {
        it('should create file', () => {
            const result = executor.execute('touch test.yaml')

            expect(result.ok).toBe(true)

            const readResult = fileSystem.readFile('test.yaml')
            expect(readResult.ok).toBe(true)
        })

        it('should return error when filename is missing', () => {
            const result = executor.execute('touch')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('missing file operand')
            }
        })
    })

    describe('cat command', () => {
        it('should display file contents', () => {
            fileSystem.createFile('test.yaml', 'Hello World')

            const result = executor.execute('cat test.yaml')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('Hello World')
            }
        })

        it('should return error for non-existent file', () => {
            const result = executor.execute('cat nonexistent.yaml')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('No such file or directory')
            }
        })

        it('should return error when filename is missing', () => {
            const result = executor.execute('cat')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('missing file operand')
            }
        })
    })

    describe('rm command', () => {
        it('should delete file', () => {
            fileSystem.createFile('test.yaml')

            const result = executor.execute('rm test.yaml')

            expect(result.ok).toBe(true)

            const readResult = fileSystem.readFile('test.yaml')
            expect(readResult.ok).toBe(false)
        })

        it('should delete directory with -r flag', () => {
            fileSystem.createDirectory('testdir')

            const result = executor.execute('rm -r testdir')

            expect(result.ok).toBe(true)

            const cdResult = fileSystem.changeDirectory('testdir')
            expect(cdResult.ok).toBe(false)
        })

        it('should return error when operand is missing', () => {
            const result = executor.execute('rm')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('missing operand')
            }
        })
    })

    describe('clear command', () => {
        it('should return clear signal', () => {
            const result = executor.execute('clear')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('')
            }
        })
    })

    describe('help command', () => {
        it('should return help text', () => {
            const result = executor.execute('help')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Available shell commands')
                expect(result.value).toContain('cd')
                expect(result.value).toContain('ls')
                expect(result.value).toContain('pwd')
                expect(result.value).toContain('mkdir')
                expect(result.value).toContain('touch')
                expect(result.value).toContain('cat')
                expect(result.value).toContain('rm')
                expect(result.value).toContain('clear')
                expect(result.value).toContain('help')
            }
        })
    })

    describe('error handling', () => {
        it('should handle parser errors', () => {
            const result = executor.execute('')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('empty')
            }
        })

        it('should handle unknown commands', () => {
            const result = executor.execute('invalid')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Unknown command')
            }
        })

        it('should display full command in error message for unknown commands', () => {
            const result = executor.execute('qsdfjmql ksjfl mqks')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toBe('Unknown command: qsdfjmql ksjfl mqks')
            }
        })
    })

    describe('debug command', () => {
        it('should show usage message for debug without args', () => {
            const result = executor.execute('debug')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('debug logs')
                expect(result.value).toContain('debug clear')
            }
        })

        it('should show application logs with debug logs', () => {
            // Execute some commands to generate logs
            executor.execute('pwd')
            executor.execute('ls')

            const result = executor.execute('debug logs')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('Application Logs')
                expect(result.value).toContain('Shell: pwd')
                expect(result.value).toContain('Shell: ls')
            }
        })

        it('should clear application logs with debug clear', () => {
            // Generate some logs
            executor.execute('pwd')

            // Verify logs exist
            let entries = logger.getEntries()
            expect(entries.length).toBeGreaterThan(0)

            // Clear logs
            const result = executor.execute('debug clear')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toContain('cleared')
            }

            // Verify logs were cleared
            entries = logger.getEntries()
            expect(entries.length).toBe(0)
        })

        it('should return error for unknown debug subcommand', () => {
            const result = executor.execute('debug unknown')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Unknown debug subcommand')
            }
        })
    })

    describe('logger integration', () => {
        it('should log command execution', () => {
            executor.execute('pwd')

            const entries = logger.getEntries({ category: 'COMMAND' })
            expect(entries.length).toBeGreaterThan(0)
            expect(entries.some(e => e.message.includes('Shell: pwd'))).toBe(true)
        })

        it('should log filesystem operations', () => {
            executor.execute('mkdir testdir')

            const entries = logger.getEntries({ category: 'FILESYSTEM' })
            expect(entries.length).toBeGreaterThan(0)
            expect(entries.some(e => e.message.includes('Creating directory'))).toBe(true)
        })

        it('should log errors', () => {
            executor.execute('cd nonexistent')

            const entries = logger.getEntries({ level: 'error' })
            expect(entries.length).toBeGreaterThan(0)
        })
    })
})


